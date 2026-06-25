import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveGlobalConfigPda, deriveTreasuryPda } from "@sol-tictactoe/shared";
import { config } from "./config";
import { logAdminAction, recordBankEntry, sumBankLedgerLamports } from "./db";
import type { BankLedgerType } from "./database/types";
import { getAuthority, getAuthorityPublicKey, getFeeRecipientPublicKey } from "./escrow-client";
import idl from "./idl/match_escrow.json";
import { getRuntimeConfig } from "./settings";

export type HouseWalletSource = "fee" | "authority" | "treasury";

export interface HouseWalletLimits {
  minReserveLamports: number;
  txFeeBufferLamports: number;
  maxPerTransferLamports: number;
  dailyCapLamports: number;
  dailyUsedLamports: number;
  dailyRemainingLamports: number;
}

export interface HouseWalletSourceStatus {
  id: HouseWalletSource;
  address: string;
  balanceLamports: number;
  maxWithdrawLamports: number;
  canWithdraw: boolean;
  custodial: boolean;
  blockedReason?: string;
  ledgerRakeLamports?: number;
  ledgerWithdrawnLamports?: number;
}

export interface HouseWalletStatus {
  limits: HouseWalletLimits;
  sources: HouseWalletSourceStatus[];
  mockEscrow: boolean;
}

const WITHDRAW_LEDGER_TYPES: BankLedgerType[] = [
  "fee_withdraw",
  "treasury_withdraw",
];

function startOfUtcDayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function computeMaxWithdraw(
  balanceLamports: number,
  limits: Omit<
    HouseWalletLimits,
    "dailyUsedLamports" | "dailyRemainingLamports"
  >,
  dailyUsedLamports: number,
): number {
  const afterReserve = Math.max(
    0,
    balanceLamports -
      limits.minReserveLamports -
      limits.txFeeBufferLamports,
  );
  const dailyLeft = Math.max(0, limits.dailyCapLamports - dailyUsedLamports);
  return Math.min(
    afterReserve,
    limits.maxPerTransferLamports,
    dailyLeft,
  );
}

function loadOptionalKeypair(path: string): Keypair | null {
  if (!fs.existsSync(path)) return null;
  try {
    const secret = JSON.parse(fs.readFileSync(path, "utf-8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch {
    return null;
  }
}

function getFeeWalletKeypair(): Keypair | null {
  return loadOptionalKeypair(config.feeWalletKeypairPath);
}

function walletLimits(dailyUsedLamports: number): HouseWalletLimits {
  return {
    minReserveLamports: config.houseWalletMinReserveLamports,
    txFeeBufferLamports: config.houseWalletTxFeeBufferLamports,
    maxPerTransferLamports: config.houseWalletMaxWithdrawLamports,
    dailyCapLamports: config.houseWalletDailyWithdrawCapLamports,
    dailyUsedLamports,
    dailyRemainingLamports: Math.max(
      0,
      config.houseWalletDailyWithdrawCapLamports - dailyUsedLamports,
    ),
  };
}

export async function getHouseWalletStatus(): Promise<HouseWalletStatus> {
  const runtime = getRuntimeConfig();
  const connection = new Connection(runtime.rpcUrl, "confirmed");
  const dailyUsed = await sumBankLedgerLamports({
    types: WITHDRAW_LEDGER_TYPES,
    since: startOfUtcDayMs(),
  });
  const limitsBase = walletLimits(dailyUsed);
  const limitsForMax = {
    minReserveLamports: limitsBase.minReserveLamports,
    txFeeBufferLamports: limitsBase.txFeeBufferLamports,
    maxPerTransferLamports: limitsBase.maxPerTransferLamports,
    dailyCapLamports: limitsBase.dailyCapLamports,
  };

  const authorityAddress = getAuthorityPublicKey();
  const feeAddress = getFeeRecipientPublicKey();
  const feeKeypair = getFeeWalletKeypair();
  const feeCustodial =
    feeKeypair != null && feeKeypair.publicKey.toBase58() === feeAddress;

  const [authorityBal, feeBal] = await Promise.all([
    connection.getBalance(new PublicKey(authorityAddress)),
    connection.getBalance(new PublicKey(feeAddress)),
  ]);

  let treasuryAddress = "";
  let treasuryBal = 0;
  let treasuryOnChainMax = 0;
  if (runtime.programId) {
    try {
      const [treasuryPda] = deriveTreasuryPda(runtime.programId);
      treasuryAddress = treasuryPda.toBase58();
      treasuryBal = await connection.getBalance(treasuryPda);
      const rent = await connection.getMinimumBalanceForRentExemption(8);
      treasuryOnChainMax = Math.max(0, treasuryBal - rent);
    } catch {
      /* invalid program id */
    }
  }

  const feeLedgerRake = await sumBankLedgerLamports({
    types: ["rake_fee"],
    wallet: feeAddress,
  });
  const feeLedgerWithdrawn = await sumBankLedgerLamports({
    types: ["fee_withdraw"],
    wallet: feeAddress,
  });

  const authorityMax = computeMaxWithdraw(authorityBal, limitsForMax, dailyUsed);
  const feeMax = computeMaxWithdraw(feeBal, limitsForMax, dailyUsed);
  const treasuryMax = computeMaxWithdraw(
    treasuryOnChainMax,
    limitsForMax,
    dailyUsed,
  );

  const sources: HouseWalletSourceStatus[] = [
    {
      id: "fee",
      address: feeAddress,
      balanceLamports: feeBal,
      maxWithdrawLamports: feeMax,
      canWithdraw: feeCustodial && feeMax > 0 && !runtime.mockEscrow,
      custodial: feeCustodial,
      blockedReason: runtime.mockEscrow
        ? "mock_escrow"
        : !feeCustodial
          ? "no_fee_keypair"
          : feeMax <= 0
            ? "insufficient_balance"
            : undefined,
      ledgerRakeLamports: feeLedgerRake,
      ledgerWithdrawnLamports: feeLedgerWithdrawn,
    },
    {
      id: "authority",
      address: authorityAddress,
      balanceLamports: authorityBal,
      maxWithdrawLamports: authorityMax,
      canWithdraw: authorityMax > 0 && !runtime.mockEscrow,
      custodial: true,
      blockedReason: runtime.mockEscrow
        ? "mock_escrow"
        : authorityMax <= 0
          ? "insufficient_balance"
          : undefined,
    },
    {
      id: "treasury",
      address: treasuryAddress || "—",
      balanceLamports: treasuryBal,
      maxWithdrawLamports: treasuryMax,
      canWithdraw:
        Boolean(treasuryAddress) &&
        treasuryMax > 0 &&
        !runtime.mockEscrow,
      custodial: true,
      blockedReason: runtime.mockEscrow
        ? "mock_escrow"
        : !treasuryAddress
          ? "no_program"
          : treasuryMax <= 0
            ? "insufficient_balance"
            : undefined,
    },
  ];

  return {
    limits: limitsBase,
    sources,
    mockEscrow: runtime.mockEscrow,
  };
}

async function transferSol(
  connection: Connection,
  from: Keypair,
  to: PublicKey,
  lamports: number,
): Promise<string> {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports,
    }),
  );
  return sendAndConfirmTransaction(connection, tx, [from], {
    commitment: "confirmed",
  });
}

async function withdrawTreasuryOnChain(
  amountLamports: number,
): Promise<string> {
  const runtime = getRuntimeConfig();
  const authority = getAuthority();
  const connection = new Connection(runtime.rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(authority);
  const program = new anchor.Program(
    { ...(idl as anchor.Idl), address: runtime.programId },
    new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" }),
  );
  const [globalConfig] = deriveGlobalConfigPda(runtime.programId);
  const [houseTreasury] = deriveTreasuryPda(runtime.programId);

  return program.methods
    .withdrawTreasury(new anchor.BN(amountLamports))
    .accountsPartial({
      authority: authority.publicKey,
      globalConfig,
      houseTreasury,
      treasuryTokenAccount: undefined,
      authorityTokenAccount: undefined,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function transferHouseWallet(input: {
  source: HouseWalletSource;
  destination: string;
  amountLamports: number;
  actor?: string;
}): Promise<{ signature: string; source: HouseWalletSource; destination: string }> {
  const runtime = getRuntimeConfig();
  if (runtime.mockEscrow) {
    throw new Error("Desative mock escrow para sacar da carteira da casa");
  }

  if (!Number.isInteger(input.amountLamports) || input.amountLamports <= 0) {
    throw new Error("Valor inválido");
  }

  let destinationPk: PublicKey;
  try {
    destinationPk = new PublicKey(input.destination.trim());
  } catch {
    throw new Error("Carteira de destino inválida");
  }

  const status = await getHouseWalletStatus();
  const sourceStatus = status.sources.find((s) => s.id === input.source);
  if (!sourceStatus) {
    throw new Error("Origem inválida");
  }
  if (!sourceStatus.canWithdraw) {
    throw new Error(
      sourceStatus.blockedReason === "no_fee_keypair"
        ? "Configure FEE_WALLET_KEYPAIR_PATH no servidor (keypair da carteira de taxas)"
        : "Saque não disponível para esta origem",
    );
  }
  if (input.amountLamports > sourceStatus.maxWithdrawLamports) {
    throw new Error(
      `Valor excede o máximo permitido (${sourceStatus.maxWithdrawLamports} lamports)`,
    );
  }

  const connection = new Connection(runtime.rpcUrl, "confirmed");
  let signature: string;
  let ledgerType: BankLedgerType;
  let ledgerWallet: string;
  let treasuryWithdrawTx: string | undefined;

  if (input.source === "fee") {
    const kp = getFeeWalletKeypair();
    if (!kp || kp.publicKey.toBase58() !== sourceStatus.address) {
      throw new Error("Keypair da carteira de taxas não configurada");
    }
    if (destinationPk.equals(kp.publicKey)) {
      throw new Error("Destino deve ser diferente da origem");
    }
    signature = await transferSol(connection, kp, destinationPk, input.amountLamports);
    ledgerType = "fee_withdraw";
    ledgerWallet = sourceStatus.address;
  } else if (input.source === "authority") {
    const kp = getAuthority();
    if (destinationPk.equals(kp.publicKey)) {
      throw new Error("Destino deve ser diferente da origem");
    }
    signature = await transferSol(connection, kp, destinationPk, input.amountLamports);
    ledgerType = "fee_withdraw";
    ledgerWallet = sourceStatus.address;
  } else {
    treasuryWithdrawTx = await withdrawTreasuryOnChain(input.amountLamports);
    ledgerType = "treasury_withdraw";
    ledgerWallet = sourceStatus.address;
    const authorityKp = getAuthority();
    if (destinationPk.equals(authorityKp.publicKey)) {
      signature = treasuryWithdrawTx;
    } else {
      signature = await transferSol(
        connection,
        authorityKp,
        destinationPk,
        input.amountLamports,
      );
    }
  }

  await recordBankEntry({
    type: ledgerType,
    wallet: ledgerWallet,
    lamports: input.amountLamports,
    signature,
    metadata: {
      destination: destinationPk.toBase58(),
      source: input.source,
      ...(treasuryWithdrawTx && signature !== treasuryWithdrawTx
        ? { treasuryWithdrawTx }
        : {}),
    },
  });
  await logAdminAction(
    "house_wallet_transfer",
    {
      source: input.source,
      destination: destinationPk.toBase58(),
      amountLamports: input.amountLamports,
      signature,
    },
    input.actor,
  );

  return {
    signature,
    source: input.source,
    destination: destinationPk.toBase58(),
  };
}
