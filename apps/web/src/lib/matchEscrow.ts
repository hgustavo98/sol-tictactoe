import * as anchor from "@coral-xyz/anchor";
import {
  decodeMatchAccountData,
  deriveGlobalConfigPda,
  deriveMatchPda,
  deriveVaultPda,
  isOnChainMatchJoinable,
  matchIdToSeed,
  ON_CHAIN_MATCH_STATUS,
  programPubkey,
} from "@sol-tictactoe/shared";
import {
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Wallet } from "@coral-xyz/anchor";
import idl from "../idl/match_escrow.json";
import { getProgramId, type SolanaCluster } from "../config/tokens";

const DEFAULT_PUBKEY = PublicKey.default;
/** Entry + tx fee + small buffer so Phantom simulation matches preflight. */
const JOIN_BALANCE_BUFFER_LAMPORTS = 3_000_000;

/** Anchor optional accounts for native SOL escrow (no SPL). */
function solEscrowOptionalAccounts(program: MatchEscrowProgram) {
  const none = program.programId;
  return {
    tokenMint: none,
    player1TokenAccount: none,
    player2TokenAccount: none,
    playerTokenAccount: none,
    winnerTokenAccount: none,
    feeRecipientTokenAccount: none,
  };
}

export class MatchJoinValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchJoinValidationError";
  }
}

function phantomNetworkHint(cluster: SolanaCluster): string {
  if (cluster === "devnet") {
    return " Confirme que a Phantom está em Devnet (ícone ⚙️ → Developer Settings → Testnet Mode).";
  }
  if (cluster === "mainnet-beta") {
    return " Confirme que a Phantom está em Mainnet.";
  }
  return "";
}

function mapSimulationFailure(logs: string, cluster: SolanaCluster): never {
  const networkHint = phantomNetworkHint(cluster);
  if (/Cannot join your own match|6005/i.test(logs)) {
    throw new MatchJoinValidationError(
      "Você não pode entrar na sua própria mesa com esta carteira.",
    );
  }
  if (/Invalid match status|6004/i.test(logs)) {
    throw new MatchJoinValidationError(
      `Esta mesa não está mais disponível on-chain. Atualize a lista de mesas abertas.${networkHint}`,
    );
  }
  if (
    /insufficient lamports|InsufficientFunds|custom program error: 0x1/i.test(
      logs,
    )
  ) {
    throw new MatchJoinValidationError(
      "Saldo insuficiente para a entrada + taxas de rede. Deixe ~0.003 SOL extra na carteira.",
    );
  }
  if (/AccountNotFound|could not find account/i.test(logs)) {
    throw new MatchJoinValidationError(
      `Escrow desta mesa não existe nesta rede.${networkHint}`,
    );
  }
  throw new MatchJoinValidationError(
    `Não foi possível preparar a entrada nesta mesa. Atualize a lista ou recrie a mesa.${networkHint}`,
  );
}

async function assertEscrowProgramOnCluster(
  connection: Connection,
  programId: string,
  cluster: SolanaCluster,
): Promise<void> {
  const programPk = programPubkey(programId);
  const info = await connection.getAccountInfo(programPk, "confirmed");
  if (!info?.executable) {
    throw new MatchJoinValidationError(
      cluster === "devnet"
        ? "Programa escrow não encontrado no Devnet. Ative Devnet na Phantom (Developer Settings → Testnet Mode) e recarregue a página."
        : "Programa escrow não encontrado nesta rede.",
    );
  }
}

async function fetchOnChainMatch(
  connection: Connection,
  matchId: string,
  programId?: string,
) {
  const { matchAccount, escrowVault } = deriveMatchAccounts(matchId, programId);
  const info = await connection.getAccountInfo(matchAccount, "confirmed");
  if (!info?.data) {
    throw new MatchJoinValidationError(
      "Escrow desta mesa não existe on-chain. Peça ao host para recriar a mesa.",
    );
  }

  let match;
  try {
    match = decodeMatchAccountData(info.data);
  } catch {
    throw new MatchJoinValidationError(
      "Conta on-chain inválida para esta mesa. Escolha outra mesa aberta.",
    );
  }

  return { matchPda: matchAccount, escrowVault, match };
}

export async function checkMatchOpenOnChain(
  connection: Connection,
  input: {
    matchId: string;
    joiner?: PublicKey;
    expectedBetLamports?: number;
    programId?: string;
  },
): Promise<boolean> {
  try {
    const { matchPda, escrowVault, match } = await fetchOnChainMatch(
      connection,
      input.matchId,
      input.programId,
    );
    if (!isOnChainMatchJoinable(match, input.joiner)) return false;
    if (
      input.expectedBetLamports != null &&
      match.betLamports !== input.expectedBetLamports
    ) {
      return false;
    }
    if (!match.escrowVault.equals(escrowVault)) return false;
    const vaultBalance = await connection.getBalance(escrowVault, "confirmed");
    return vaultBalance >= match.betLamports;
  } catch {
    return false;
  }
}

export async function isMatchJoinableForWallet(
  connection: Connection,
  wallet: Wallet,
  input: {
    matchId: string;
    expectedBetLamports?: number;
    programId?: string;
  },
): Promise<boolean> {
  try {
    await assertMatchJoinableOnChain(connection, wallet, {
      matchId: input.matchId,
      joiner: wallet.publicKey,
      expectedBetLamports: input.expectedBetLamports,
      programId: input.programId,
    });
    return true;
  } catch {
    return false;
  }
}

export async function assertMatchJoinableOnChain(
  connection: Connection,
  wallet: Wallet,
  input: {
    matchId: string;
    joiner: PublicKey;
    expectedBetLamports?: number;
    programId?: string;
    cluster?: SolanaCluster;
  },
): Promise<{ matchPda: PublicKey; escrowVault: PublicKey; betLamports: number }> {
  const pid = input.programId ?? getProgramId();
  await assertEscrowProgramOnCluster(connection, pid, input.cluster ?? "devnet");

  const { matchPda, escrowVault, match } = await fetchOnChainMatch(
    connection,
    input.matchId,
    pid,
  );

  if (!isOnChainMatchJoinable(match, input.joiner)) {
    if (match.player1.equals(input.joiner)) {
      throw new MatchJoinValidationError(
        "Você não pode entrar na sua própria mesa com esta carteira.",
      );
    }
    if (match.status === ON_CHAIN_MATCH_STATUS.Cancelled) {
      throw new MatchJoinValidationError(
        "Esta mesa foi cancelada on-chain. Atualize a lista de mesas abertas.",
      );
    }
    if (
      match.status === ON_CHAIN_MATCH_STATUS.Funded ||
      match.status === ON_CHAIN_MATCH_STATUS.Joined ||
      !match.player2.equals(DEFAULT_PUBKEY)
    ) {
      throw new MatchJoinValidationError(
        "Esta mesa já tem oponente on-chain. Escolha outra mesa.",
      );
    }
    if (match.hasTokenMint) {
      throw new MatchJoinValidationError(
        "Esta mesa usa token SPL — ainda não suportado nesta versão.",
      );
    }
    throw new MatchJoinValidationError(
      "Esta mesa não aceita mais entradas.",
    );
  }

  const betLamports = match.betLamports;
  if (
    input.expectedBetLamports != null &&
    betLamports !== input.expectedBetLamports
  ) {
    throw new MatchJoinValidationError(
      "O valor da aposta desta mesa mudou. Atualize a lista e tente novamente.",
    );
  }

  const vaultBalance = await connection.getBalance(escrowVault, "confirmed");
  if (vaultBalance < betLamports) {
    throw new MatchJoinValidationError(
      "O host ainda não depositou no escrow. Aguarde ou escolha outra mesa.",
    );
  }

  const balance = await connection.getBalance(input.joiner, "confirmed");
  const minRequired = betLamports + JOIN_BALANCE_BUFFER_LAMPORTS;
  if (balance < minRequired) {
    throw new MatchJoinValidationError(
      `Saldo insuficiente. Você precisa de pelo menos ${(betLamports / 1_000_000_000).toFixed(3)} SOL + ~0.003 SOL para taxas de rede.`,
    );
  }

  if (!match.escrowVault.equals(escrowVault)) {
    throw new MatchJoinValidationError(
      "Endereço do vault on-chain não confere. Escolha outra mesa.",
    );
  }

  return { matchPda, escrowVault, betLamports };
}

type EscrowOnChainAccounts = {
  match: {
    fetch: (address: PublicKey) => Promise<{ player2: PublicKey }>;
  };
  globalConfig: {
    fetch: (address: PublicKey) => Promise<{ feeRecipient: PublicKey }>;
  };
};

export type MatchEscrowProgram = anchor.Program;

export function getMatchEscrowProgram(
  connection: Connection,
  wallet: Wallet,
  programId?: string,
): MatchEscrowProgram {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const pid = programId ?? getProgramId();
  return new anchor.Program(
    { ...(idl as anchor.Idl), address: pid },
    provider,
  );
}

export function deriveMatchAccounts(matchId: string, programId?: string) {
  const program = programPubkey(programId ?? getProgramId());
  const [matchAccount] = deriveMatchPda(matchId, program.toBase58());
  const [escrowVault] = deriveVaultPda(matchAccount, program.toBase58());
  const [globalConfig] = deriveGlobalConfigPda(program.toBase58());
  return { matchAccount, escrowVault, globalConfig, program };
}

export async function buildCreateMatchTx(
  connection: Connection,
  wallet: Wallet,
  input: {
    matchId: string;
    betLamports: number;
    rakeBps: number;
    programId?: string;
  },
): Promise<{ tx: Transaction; matchPda: string; signature?: string }> {
  const program = getMatchEscrowProgram(connection, wallet, input.programId);
  const { matchAccount, escrowVault, globalConfig } = deriveMatchAccounts(
    input.matchId,
    input.programId,
  );
  const optional = solEscrowOptionalAccounts(program);

  const tx = await program.methods
    .createMatch(
      new anchor.BN(input.betLamports),
      Array.from(matchIdToSeed(input.matchId)),
      input.rakeBps,
    )
    .accountsPartial({
      player1: wallet.publicKey,
      globalConfig,
      matchAccount,
      escrowVault,
      tokenMint: optional.tokenMint,
      player1TokenAccount: optional.player1TokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return { tx, matchPda: matchAccount.toBase58() };
}

export async function buildJoinMatchTx(
  connection: Connection,
  wallet: Wallet,
  input: {
    matchId: string;
    expectedBetLamports?: number;
    programId?: string;
    cluster?: SolanaCluster;
  },
): Promise<{ tx: Transaction; matchPda: string; betLamports: number }> {
  const program = getMatchEscrowProgram(connection, wallet, input.programId);
  const { matchPda, escrowVault, betLamports } =
    await assertMatchJoinableOnChain(connection, wallet, {
      matchId: input.matchId,
      joiner: wallet.publicKey,
      expectedBetLamports: input.expectedBetLamports,
      programId: input.programId,
      cluster: input.cluster,
    });

  const optional = solEscrowOptionalAccounts(program);

  const tx = await program.methods
    .joinMatch()
    .accountsPartial({
      player2: wallet.publicKey,
      matchAccount: matchPda,
      escrowVault,
      player2TokenAccount: optional.player2TokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return { tx, matchPda: matchPda.toBase58(), betLamports };
}

export async function buildFundMatchTx(
  connection: Connection,
  wallet: Wallet,
  input: {
    matchPda: string;
    matchId: string;
    programId?: string;
  },
): Promise<Transaction> {
  const program = getMatchEscrowProgram(connection, wallet, input.programId);
  const matchAccount = new PublicKey(input.matchPda);
  const [escrowVault] = deriveVaultPda(
    matchAccount,
    input.programId ?? getProgramId(),
  );
  const optional = solEscrowOptionalAccounts(program);

  return program.methods
    .fundMatch()
    .accountsPartial({
      player: wallet.publicKey,
      matchAccount,
      escrowVault,
      playerTokenAccount: optional.playerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
}

export async function buildCancelMatchTx(
  connection: Connection,
  wallet: Wallet,
  input: {
    matchPda: string;
    matchId: string;
    programId?: string;
  },
): Promise<Transaction> {
  const program = getMatchEscrowProgram(connection, wallet, input.programId);
  const matchAccount = new PublicKey(input.matchPda);
  const { escrowVault, globalConfig } = deriveMatchAccounts(
    input.matchId,
    input.programId,
  );
  const accounts = program.account as EscrowOnChainAccounts;
  const matchData = await accounts.match.fetch(matchAccount);
  const configData = await accounts.globalConfig.fetch(globalConfig);
  const player2Pk = new PublicKey(matchData.player2);
  const player2Key = player2Pk.equals(SystemProgram.programId)
    ? SystemProgram.programId
    : player2Pk;
  const optional = solEscrowOptionalAccounts(program);

  return program.methods
    .cancelMatch()
    .accountsPartial({
      player1: wallet.publicKey,
      globalConfig,
      matchAccount,
      escrowVault,
      player2: player2Key,
      feeRecipient: configData.feeRecipient,
      player1TokenAccount: optional.player1TokenAccount,
      player2TokenAccount: optional.player2TokenAccount,
      feeRecipientTokenAccount: optional.feeRecipientTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
}

export async function sendEscrowTx(
  connection: Connection,
  wallet: Wallet,
  tx: Transaction,
  options?: {
    cluster?: SolanaCluster;
    sendTransaction?: (
      transaction: Transaction,
      connection: Connection,
      options?: { skipPreflight?: boolean; preflightCommitment?: "confirmed" | "finalized" | "processed"; maxRetries?: number },
    ) => Promise<string>;
  },
): Promise<string> {
  tx.feePayer = wallet.publicKey;
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latest.blockhash;

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    mapSimulationFailure(
      simulation.value.logs?.join("\n") ?? "",
      options?.cluster ?? "devnet",
    );
  }

  if (options?.sendTransaction) {
    try {
      const signature = await options.sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed",
      );
      return signature;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/User rejected|rejected the request|cancelled/i.test(message)) {
        throw err;
      }
      mapSimulationFailure(message, options?.cluster ?? "devnet");
    }
  }

  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed",
  );
  return signature;
}
