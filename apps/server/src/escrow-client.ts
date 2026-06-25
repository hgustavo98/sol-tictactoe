import * as anchor from "@coral-xyz/anchor";
import crypto from "crypto";
import fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  computeBetBreakdown,
  computeDrawBreakdown,
  decodeMatchAccountData,
  deriveGlobalConfigPda,
  deriveMatchPda,
  deriveVaultPda,
  isOnChainMatchJoinable,
  LOBBY_CANCEL_REFUND_WAIT_SECS,
  type MatchReceipt,
  programPubkey,
} from "@sol-tictactoe/shared";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { config } from "./config";
import { saveReceipt, recordBankEntry } from "./db";
import { getRuntimeConfig } from "./settings";
import idl from "./idl/match_escrow.json";

interface SettleInput {
  matchId: string;
  gamePubkey: string;
  winner: string;
  playerWhite: string;
  playerBlack: string;
  betLamports: number;
  rakeBps: number;
  tokenMint?: string | null;
  pgn: string;
  isDraw: boolean;
}

let authorityKeypair: Keypair | null = null;

export function getAuthority(): Keypair {
  if (!authorityKeypair) {
    if (config.authorityKeypairJson.trim()) {
      try {
        const secret = JSON.parse(config.authorityKeypairJson) as number[];
        authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
      } catch {
        throw new Error(
          "AUTHORITY_KEYPAIR_JSON is set but is not a valid JSON byte array",
        );
      }
    } else if (fs.existsSync(config.authorityKeypairPath)) {
      const secret = JSON.parse(
        fs.readFileSync(config.authorityKeypairPath, "utf-8"),
      ) as number[];
      authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
    } else {
      if (config.isProduction) {
        throw new Error(
          "Authority keypair missing. Set AUTHORITY_KEYPAIR_JSON (env secret) or AUTHORITY_KEYPAIR_PATH.",
        );
      }
      authorityKeypair = Keypair.generate();
      fs.writeFileSync(
        config.authorityKeypairPath,
        JSON.stringify(Array.from(authorityKeypair.secretKey)),
      );
      console.log(
        `[escrow] Generated authority keypair at ${config.authorityKeypairPath}`,
      );
    }
  }
  return authorityKeypair;
}

export function getAuthorityPublicKey(): string {
  return getAuthority().publicKey.toBase58();
}

export function getFeeRecipientPublicKey(): string {
  const runtime = getRuntimeConfig();
  return runtime.feeRecipientWallet || getAuthorityPublicKey();
}

export function isEscrowReady(): boolean {
  const runtime = getRuntimeConfig();
  if (runtime.mockEscrow || !runtime.programId) return false;
  try {
    getFeeRecipientPublicKey();
    getAuthorityPublicKey();
    return true;
  } catch {
    return false;
  }
}

function hashPgn(pgn: string): string {
  return crypto.createHash("sha256").update(pgn).digest("hex");
}

function buildReceiptHash(input: {
  matchId: string;
  pgn: string;
  winner?: string;
  settleSignature?: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        matchId: input.matchId,
        pgnHash: hashPgn(input.pgn),
        winner: input.winner,
        settleSignature: input.settleSignature,
      }),
    )
    .digest("hex");
}

function runtime() {
  return getRuntimeConfig();
}

function getProgram(connection: Connection): anchor.Program {
  const wallet = new anchor.Wallet(getAuthority());
  const rt = runtime();
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new anchor.Program(
    { ...(idl as anchor.Idl), address: rt.programId },
    provider,
  );
}

/** Anchor optional accounts for native SOL escrow — program id means None. */
function solEscrowOptionalAccounts(program: anchor.Program) {
  const none = program.programId;
  return {
    tokenMint: none,
    winnerTokenAccount: none,
    feeRecipientTokenAccount: none,
    player1TokenAccount: none,
    player2TokenAccount: none,
    playerTokenAccount: none,
  };
}

function matchAccounts(matchId: string, matchAccount: PublicKey) {
  const rt = runtime();
  const [globalConfig] = deriveGlobalConfigPda(rt.programId);
  const [escrowVault] = deriveVaultPda(matchAccount, rt.programId);
  const feeRecipient = new PublicKey(getFeeRecipientPublicKey());
  return { globalConfig, escrowVault, feeRecipient, program: programPubkey(rt.programId) };
}

export async function verifyMatchFunded(
  matchId: string,
  gamePubkey: string,
  expectedBetLamports: number,
  expectedRakeBps: number,
): Promise<void> {
  if (runtime().mockEscrow || expectedBetLamports === 0) return;

  const rt = runtime();
  const connection = new Connection(rt.rpcUrl, "confirmed");
  const matchAccount = new PublicKey(gamePubkey);
  const [expectedPda] = deriveMatchPda(matchId, rt.programId);
  if (!matchAccount.equals(expectedPda)) {
    throw new Error("onChainAddress does not match match PDA");
  }

  const matchInfo = await connection.getAccountInfo(matchAccount);
  if (!matchInfo) {
    throw new Error("On-chain match account not found");
  }

  const decoded = decodeMatchAccountData(matchInfo.data);
  if (decoded.betLamports !== expectedBetLamports) {
    throw new Error(
      `On-chain bet mismatch: ${decoded.betLamports} vs expected ${expectedBetLamports}`,
    );
  }
  if (decoded.rakeBps !== expectedRakeBps) {
    throw new Error(
      `On-chain rake mismatch: ${decoded.rakeBps} bps vs expected ${expectedRakeBps} bps`,
    );
  }

  const vaultBalance = await connection.getBalance(decoded.escrowVault);
  const required = expectedBetLamports * 2;
  if (vaultBalance < required) {
    throw new Error(
      `Vault underfunded: ${vaultBalance} lamports, need ${required}`,
    );
  }
}

function readMatchAccountFields(data: Buffer): {
  player1: PublicKey;
  player2: PublicKey;
  status: number;
  player1Funded: boolean;
  createdAtSec: number;
  betLamports: number;
  escrowVault: PublicKey;
} {
  const match = decodeMatchAccountData(data);
  return {
    player1: match.player1,
    player2: match.player2,
    status: match.status,
    player1Funded: match.player1Funded,
    createdAtSec: match.createdAtSec,
    betLamports: match.betLamports,
    escrowVault: match.escrowVault,
  };
}

export async function isPaidLobbyJoinableOnChain(input: {
  matchId: string;
  gamePubkey: string;
  betLamports: number;
  rakeBps?: number;
}): Promise<boolean> {
  if (runtime().mockEscrow || input.betLamports === 0) return true;

  const rt = runtime();
  const connection = new Connection(rt.rpcUrl, "confirmed");
  const matchAccount = new PublicKey(input.gamePubkey);
  const [expectedPda] = deriveMatchPda(input.matchId, rt.programId);
  if (!matchAccount.equals(expectedPda)) return false;

  const info = await connection.getAccountInfo(matchAccount, "confirmed");
  if (!info?.data) return false;

  const match = decodeMatchAccountData(info.data);
  if (!isOnChainMatchJoinable(match)) return false;
  if (match.betLamports !== input.betLamports) return false;
  if (input.rakeBps != null && match.rakeBps !== input.rakeBps) return false;

  const [vault] = deriveVaultPda(matchAccount, rt.programId);
  if (!match.escrowVault.equals(vault)) return false;
  const vaultBalance = await connection.getBalance(vault, "confirmed");
  return vaultBalance >= input.betLamports;
}

function readGlobalConfigFeeRecipient(data: Buffer): PublicKey {
  return new PublicKey(data.subarray(42, 74));
}

const MATCH_STATUS_CANCELLED = 4;
const MATCH_STATUS_WAITING = 0;

export async function closeWaitingMatchOnChain(input: {
  matchId: string;
  gamePubkey: string;
  player1: string;
  betLamports: number;
  /** When true, entry always goes to fee recipient (e.g. host abandoned waiting room). */
  forceForfeit?: boolean;
}): Promise<{ signature: string; earlyForfeit: boolean } | null> {
  if (runtime().mockEscrow || input.betLamports === 0) return null;

  const connection = new Connection(runtime().rpcUrl, "confirmed");
  const program = getProgram(connection);
  const authority = getAuthority();
  const matchAccount = new PublicKey(input.gamePubkey);
  const { globalConfig, escrowVault } = matchAccounts(input.matchId, matchAccount);

  const [configInfo, matchInfo] = await Promise.all([
    connection.getAccountInfo(globalConfig),
    connection.getAccountInfo(matchAccount),
  ]);
  if (!configInfo?.data) {
    throw new Error("GlobalConfig not found on-chain");
  }
  if (!matchInfo?.data) {
    console.warn(
      `[escrow] On-chain match missing for ${input.matchId}; skipping vault close`,
    );
    return null;
  }

  const fields = readMatchAccountFields(matchInfo.data);
  if (fields.status === MATCH_STATUS_CANCELLED) {
    console.log(`[escrow] Match ${input.matchId} already cancelled on-chain`);
    return null;
  }
  if (fields.status !== MATCH_STATUS_WAITING) {
    throw new Error(
      `Match status ${fields.status} cannot be closed as waiting lobby`,
    );
  }
  if (!fields.player2.equals(PublicKey.default)) {
    throw new Error("Match already has an opponent on-chain");
  }

  const feeRecipient = readGlobalConfigFeeRecipient(configInfo.data);
  const player1 = fields.player1;
  if (player1.toBase58() !== input.player1) {
    throw new Error("On-chain player1 does not match lobby host");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const forceForfeit = input.forceForfeit === true;
  const earlyForfeit =
    forceForfeit ||
    nowSec - fields.createdAtSec < LOBBY_CANCEL_REFUND_WAIT_SECS;

  const optional = solEscrowOptionalAccounts(program);

  const signature = await program.methods
    .closeWaitingMatch(forceForfeit)
    .accountsPartial({
      authority: authority.publicKey,
      globalConfig,
      matchAccount,
      escrowVault,
      player1,
      player2: fields.player2,
      feeRecipient,
      player1TokenAccount: optional.player1TokenAccount,
      feeRecipientTokenAccount: optional.feeRecipientTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  if (fields.player1Funded) {
    if (earlyForfeit) {
      await recordBankEntry({
        type: "rake_fee",
        matchId: input.matchId,
        wallet: feeRecipient.toBase58(),
        lamports: input.betLamports,
        signature,
        metadata: {
          reason: forceForfeit ? "waiting_room_abandon" : "early_lobby_close",
        },
      });
    } else {
      await recordBankEntry({
        type: "refund",
        matchId: input.matchId,
        wallet: input.player1,
        lamports: input.betLamports,
        signature,
        metadata: { reason: "lobby_cancel_refund" },
      });
    }
  }

  console.log(
    `[escrow] Closed waiting match ${input.matchId} earlyForfeit=${earlyForfeit} sig=${signature}`,
  );
  return { signature, earlyForfeit };
}

async function recordSettlementLedger(input: {
  matchId: string;
  winner: string;
  signature: string;
  betLamports: number;
  rakeBps: number;
  isDraw: boolean;
}): Promise<void> {
  if (input.betLamports === 0) return;
  const breakdown = computeBetBreakdown(input.betLamports, input.rakeBps);
  await recordBankEntry({
    type: "settlement",
    matchId: input.matchId,
    wallet: input.matchId,
    lamports: breakdown.potLamports,
    signature: input.signature,
    metadata: { isDraw: input.isDraw },
  });
  if (!input.isDraw && breakdown.rakeLamports > 0) {
    await recordBankEntry({
      type: "rake_fee",
      matchId: input.matchId,
      wallet: getFeeRecipientPublicKey(),
      lamports: breakdown.rakeLamports,
      signature: input.signature,
    });
  }
  if (!input.isDraw) {
    await recordBankEntry({
      type: "payout_winner",
      matchId: input.matchId,
      wallet: input.winner,
      lamports: breakdown.maxPayoutLamports,
      signature: input.signature,
    });
  }
}

export async function settleMatchOnChain(
  input: SettleInput,
): Promise<{ signature: string; receipt: MatchReceipt }> {
  const breakdown = input.isDraw
    ? computeDrawBreakdown(input.betLamports, input.rakeBps)
    : computeBetBreakdown(input.betLamports, input.rakeBps);

  if (runtime().mockEscrow || input.betLamports === 0) {
    const signature = `mock_${crypto.randomBytes(16).toString("hex")}`;
    const receipt: MatchReceipt = {
      matchId: input.matchId,
      playerWhite: input.playerWhite,
      playerBlack: input.playerBlack,
      winner: input.isDraw ? undefined : input.winner,
      betLamports: input.betLamports,
      potLamports: breakdown.potLamports,
      rakeLamports: breakdown.rakeLamports,
      pgn: input.pgn,
      settleSignature: signature,
      receiptHash: buildReceiptHash({
        matchId: input.matchId,
        pgn: input.pgn,
        winner: input.winner,
        settleSignature: signature,
      }),
      createdAt: Date.now(),
    };
    await saveReceipt(receipt);
    await recordSettlementLedger({
      matchId: input.matchId,
      winner: input.winner,
      signature,
      betLamports: input.betLamports,
      rakeBps: input.rakeBps,
      isDraw: input.isDraw,
    });
    return { signature, receipt };
  }

  const connection = new Connection(runtime().rpcUrl, "confirmed");
  const program = getProgram(connection);
  const authority = getAuthority();
  const matchAccount = new PublicKey(input.gamePubkey);
  const winner = new PublicKey(input.winner);
  const player1 = new PublicKey(input.playerWhite);
  const player2 = new PublicKey(input.playerBlack);
  const { globalConfig, escrowVault, feeRecipient } = matchAccounts(
    input.matchId,
    matchAccount,
  );

  const isDraw = input.isDraw ? 1 : 0;
  const optional = solEscrowOptionalAccounts(program);

  const signature = await program.methods
    .settleMatch(isDraw)
    .accountsPartial({
      authority: authority.publicKey,
      globalConfig,
      matchAccount,
      winner,
      player1,
      player2,
      escrowVault,
      feeRecipient,
      tokenMint: optional.tokenMint,
      winnerTokenAccount: optional.winnerTokenAccount,
      feeRecipientTokenAccount: optional.feeRecipientTokenAccount,
      player1TokenAccount: optional.player1TokenAccount,
      player2TokenAccount: optional.player2TokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const receipt: MatchReceipt = {
    matchId: input.matchId,
    playerWhite: input.playerWhite,
    playerBlack: input.playerBlack,
    winner: input.isDraw ? undefined : input.winner,
    betLamports: input.betLamports,
    potLamports: breakdown.potLamports,
    rakeLamports: input.isDraw ? 0 : breakdown.rakeLamports,
    pgn: input.pgn,
    settleSignature: signature,
    receiptHash: buildReceiptHash({
      matchId: input.matchId,
      pgn: input.pgn,
      winner: input.winner,
      settleSignature: signature,
    }),
    createdAt: Date.now(),
  };
  await saveReceipt(receipt);
  await recordSettlementLedger({
    matchId: input.matchId,
    winner: input.winner,
    signature,
    betLamports: input.betLamports,
    rakeBps: input.rakeBps,
    isDraw: input.isDraw,
  });
  console.log(
    `[escrow] Settled ${input.matchId} winner=${input.winner} rake→${feeRecipient.toBase58()} sig=${signature}`,
  );
  return { signature, receipt };
}

export function isMintAllowed(mint: string): boolean {
  if (config.allowedMints.length === 0) return false;
  return config.allowedMints.includes(mint);
}

export function getAllowedMints(): string[] {
  return config.allowedMints;
}

export function deriveExpectedMatchPda(matchId: string): string {
  const [pda] = deriveMatchPda(matchId, runtime().programId);
  return pda.toBase58();
}

export { matchIdToSeed } from "@sol-tictactoe/shared";
