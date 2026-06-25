/**
 * Initialize match-escrow GlobalConfig on devnet.
 *
 * Usage:
 *   FEE_RECIPIENT_WALLET=<your-wallet> npx tsx scripts/init-escrow.ts
 *
 * Requires: authority keypair at AUTHORITY_KEYPAIR_PATH (same as server).
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { deriveGlobalConfigPda, deriveTreasuryPda } from "@sol-tictactoe/shared";
import idl from "../src/idl/match_escrow.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID =
  process.env.PROGRAM_ID ?? "ChessEscrw1111111111111111111111111111111";
const FEE_RECIPIENT =
  process.env.FEE_RECIPIENT_WALLET ?? process.env.HOUSE_FEE_WALLET ?? "";
const AUTHORITY_PATH =
  process.env.AUTHORITY_KEYPAIR_PATH ??
  path.join(__dirname, "../authority.json");
const HOUSE_RAKE_BPS = parseInt(process.env.HOUSE_RAKE_BPS ?? "300", 10);

async function main() {
  if (!FEE_RECIPIENT) {
    throw new Error("Set FEE_RECIPIENT_WALLET to the wallet that receives rake");
  }

  const secret = JSON.parse(fs.readFileSync(AUTHORITY_PATH, "utf-8")) as number[];
  const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new anchor.Program(
    { ...(idl as anchor.Idl), address: PROGRAM_ID },
    provider,
  );

  const [globalConfig] = deriveGlobalConfigPda(PROGRAM_ID);
  const [houseTreasury] = deriveTreasuryPda(PROGRAM_ID);
  const feeRecipient = new PublicKey(FEE_RECIPIENT);

  const existing = await connection.getAccountInfo(globalConfig);
  if (existing) {
    console.log("GlobalConfig already initialized at", globalConfig.toBase58());
    console.log("Fee recipient configured:", FEE_RECIPIENT);
    return;
  }

  const sig = await program.methods
    .initializeConfig(HOUSE_RAKE_BPS, feeRecipient, [])
    .accounts({
      authority: authority.publicKey,
      globalConfig,
      houseTreasury,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Initialized match-escrow config");
  console.log("  tx:", sig);
  console.log("  globalConfig:", globalConfig.toBase58());
  console.log("  feeRecipient:", feeRecipient.toBase58());
  console.log("  max rake bps:", HOUSE_RAKE_BPS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
