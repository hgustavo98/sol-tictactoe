import { PublicKey } from "@solana/web3.js";

export const MATCH_ESCROW_PROGRAM_ID =
  "ChessEscrw1111111111111111111111111111111";

export const CONFIG_SEED = "config";
export const TREASURY_SEED = "treasury";
export const MATCH_SEED = "match";
export const VAULT_SEED = "vault";

/** On-chain match status (match-escrow program). */
export const ON_CHAIN_MATCH_STATUS = {
  Waiting: 0,
  Funded: 1,
  Playing: 2,
  Settled: 3,
  Cancelled: 4,
  Draw: 5,
  Joined: 6,
} as const;

export function matchIdToSeed(matchId: string): Uint8Array {
  const hex = matchId.replace(/-/g, "");
  if (hex.length !== 32) {
    throw new Error("matchId must be a UUID (32 hex chars)");
  }
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function programPubkey(programId = MATCH_ESCROW_PROGRAM_ID): PublicKey {
  return new PublicKey(programId);
}

export function deriveGlobalConfigPda(programId = MATCH_ESCROW_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programPubkey(programId),
  );
}

export function deriveTreasuryPda(programId = MATCH_ESCROW_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TREASURY_SEED)],
    programPubkey(programId),
  );
}

export function deriveMatchPda(matchId: string, programId = MATCH_ESCROW_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MATCH_SEED), Buffer.from(matchIdToSeed(matchId))],
    programPubkey(programId),
  );
}

export function deriveVaultPda(
  matchAccount: PublicKey,
  programId = MATCH_ESCROW_PROGRAM_ID,
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), matchAccount.toBuffer()],
    programPubkey(programId),
  );
}

export function isMockEscrowAddress(addr: string): boolean {
  return !addr || addr.startsWith("mock_");
}

export function isValidSolanaAddress(addr: string): boolean {
  if (isMockEscrowAddress(addr)) return false;
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

export type DecodedOnChainMatch = {
  player1: PublicKey;
  player2: PublicKey;
  betLamports: number;
  rakeBps: number;
  status: number;
  player1Funded: boolean;
  player2Funded: boolean;
  escrowVault: PublicKey;
  hasTokenMint: boolean;
  createdAtSec: number;
};

/** Decode match-escrow Match account bytes (after 8-byte discriminator). */
export function decodeMatchAccountData(data: Buffer | Uint8Array): DecodedOnChainMatch {
  const buf = Buffer.from(data);
  let offset = 8;
  const player1 = new PublicKey(buf.subarray(offset, offset + 32));
  offset += 32;
  const player2 = new PublicKey(buf.subarray(offset, offset + 32));
  offset += 32;
  const betLamports = Number(buf.readBigUInt64LE(offset));
  offset += 8;
  const rakeBps = buf.readUInt16LE(offset);
  offset += 2;
  const hasTokenMint = buf[offset] === 1;
  offset += 1;
  if (hasTokenMint) offset += 32;
  const escrowVault = new PublicKey(buf.subarray(offset, offset + 32));
  offset += 32;
  const status = buf[offset] ?? 0;
  offset += 1;
  offset += 32; // winner
  offset += 16; // match_id
  const player1Funded = buf[offset] === 1;
  offset += 1;
  const player2Funded = buf[offset] === 1;
  offset += 1;
  const createdAtSec = Number(buf.readBigInt64LE(offset));

  return {
    player1,
    player2,
    betLamports,
    rakeBps,
    status,
    player1Funded,
    player2Funded,
    escrowVault,
    hasTokenMint,
    createdAtSec,
  };
}

const DEFAULT_PUBKEY = PublicKey.default;

/** True when join_match would accept a new player2 for native SOL escrow. */
export function isOnChainMatchJoinable(
  match: DecodedOnChainMatch,
  joiner?: PublicKey,
): boolean {
  if (joiner && match.player1.equals(joiner)) return false;
  if (match.status === ON_CHAIN_MATCH_STATUS.Cancelled) return false;
  if (match.status !== ON_CHAIN_MATCH_STATUS.Waiting) return false;
  if (!match.player1Funded) return false;
  if (!match.player2.equals(DEFAULT_PUBKEY)) return false;
  if (match.hasTokenMint) return false;
  return true;
}
