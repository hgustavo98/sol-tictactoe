/**
 * Deploy match-escrow + init-escrow using docs/secrets.local.env
 *
 * Usage:
 *   node scripts/launch-deploy.mjs              # uses LAUNCH_CLUSTER from secrets
 *   node scripts/launch-deploy.mjs devnet
 *   node scripts/launch-deploy.mjs mainnet-beta
 */
import { execSync } from "child_process";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const secretsPath = path.join(root, "docs/secrets.local.env");

function loadSecrets() {
  if (!fs.existsSync(secretsPath)) {
    console.error(`Missing ${secretsPath} — copy from docs/secrets.local.env.example`);
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(secretsPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function clusterFlag(cluster) {
  if (cluster === "mainnet-beta") return "mainnet-beta";
  return "devnet";
}

const secrets = loadSecrets();
const cluster = process.argv[2] ?? secrets.LAUNCH_CLUSTER ?? "devnet";
const flag = clusterFlag(cluster);

console.log(`[launch-deploy] cluster=${flag}`);

if (!secrets.RPC_URL) {
  console.error("RPC_URL required in secrets.local.env");
  process.exit(1);
}

execSync("anchor build", { cwd: root, stdio: "inherit" });

const deployEnv = {
  ...process.env,
  ...secrets,
  HOME: process.env.HOME ?? process.env.USERPROFILE,
};

try {
  execSync(`anchor deploy --provider.cluster ${flag}`, {
    cwd: root,
    stdio: "inherit",
    env: deployEnv,
  });
} catch {
  console.error("[launch-deploy] anchor deploy failed — ensure Solana CLI + funded wallet");
  process.exit(1);
}

const keypairPath = path.join(root, "target/deploy/match_escrow-keypair.json");
if (fs.existsSync(keypairPath)) {
  const { Keypair } = require("@solana/web3.js");
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const programId = Keypair.fromSecretKey(Uint8Array.from(raw)).publicKey.toBase58();
  console.log(`[launch-deploy] PROGRAM_ID=${programId}`);
  secrets.PROGRAM_ID = programId;
}

if (!secrets.FEE_RECIPIENT_WALLET?.trim()) {
  console.error("FEE_RECIPIENT_WALLET required before init-escrow");
  process.exit(1);
}

execSync("npm run init-escrow -w @sol-tictactoe/server", {
  cwd: root,
  stdio: "inherit",
  env: {
    ...deployEnv,
    PROGRAM_ID: secrets.PROGRAM_ID,
    MOCK_ESCROW: "false",
  },
});

console.log("[launch-deploy] Done. Update PROGRAM_ID / VITE_PROGRAM_ID in env if changed.");
