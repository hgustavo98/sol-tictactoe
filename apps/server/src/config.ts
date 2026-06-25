import dotenv from "dotenv";
import path from "path";
import { ONE_V_ONE_CLOCK_MS } from "@sol-tictactoe/shared";
import { inferSolanaCluster, type SolanaCluster } from "./solana-cluster";

dotenv.config({ path: path.join(__dirname, "../.env") });

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Apex ↔ www pairs so CORS works when users land on either host. */
function expandCorsOrigins(origins: string[]): string[] {
  const out = new Set(origins);
  for (const raw of origins) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      const port = url.port ? `:${url.port}` : "";
      const host = url.hostname;
      if (host.startsWith("www.")) {
        out.add(`${url.protocol}//${host.slice(4)}${port}`);
      } else if (
        !host.includes("localhost") &&
        !host.startsWith("127.") &&
        host.includes(".")
      ) {
        out.add(`${url.protocol}//www.${host}${port}`);
      }
    } catch {
      /* ignore malformed origins */
    }
  }
  return [...out];
}

const corsOrigins = expandCorsOrigins(
  parseCorsOrigins(
    process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174",
  ),
);

const isProduction = process.env.NODE_ENV === "production";

/** When true (default in production), honor X-Forwarded-For / CF-Connecting-IP for rate limits. */
const trustProxy =
  process.env.TRUST_PROXY === "true" ||
  (process.env.TRUST_PROXY !== "false" && isProduction);

const rpcUrl = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const solanaCluster: SolanaCluster = inferSolanaCluster(
  rpcUrl,
  process.env.LAUNCH_CLUSTER,
);

export const config = {
  isProduction,
  trustProxy,
  port: parseInt(process.env.PORT ?? "3000", 10),
  rpcUrl,
  solanaCluster,
  programId: process.env.PROGRAM_ID ?? "ChessEscrw1111111111111111111111111111111",
  houseRakeBps: parseInt(process.env.HOUSE_RAKE_BPS ?? "300", 10),
  /** Wallet that receives house rake on each settled match. */
  feeRecipientWallet:
    process.env.FEE_RECIPIENT_WALLET ?? process.env.HOUSE_FEE_WALLET ?? "",
  /** Optional keypair to sign fee-wallet withdrawals from admin (must match fee recipient). */
  feeWalletKeypairPath:
    process.env.FEE_WALLET_KEYPAIR_PATH ??
    path.join(__dirname, "../fee-wallet.json"),
  /** Min SOL left on custodial wallets after withdraw (lamports). */
  houseWalletMinReserveLamports: parseInt(
    process.env.HOUSE_WALLET_MIN_RESERVE_LAMPORTS ?? "5000000",
    10,
  ),
  /** Max lamports per single admin withdraw. */
  houseWalletMaxWithdrawLamports: parseInt(
    process.env.HOUSE_WALLET_MAX_WITHDRAW_LAMPORTS ?? "5000000000",
    10,
  ),
  /** Max lamports withdrawn per UTC day across admin wallet ops. */
  houseWalletDailyWithdrawCapLamports: parseInt(
    process.env.HOUSE_WALLET_DAILY_WITHDRAW_CAP_LAMPORTS ?? "50000000000",
    10,
  ),
  /** Buffer reserved for network fees on each transfer (lamports). */
  houseWalletTxFeeBufferLamports: parseInt(
    process.env.HOUSE_WALLET_TX_FEE_BUFFER_LAMPORTS ?? "10000",
    10,
  ),
  authorityKeypairPath:
    process.env.AUTHORITY_KEYPAIR_PATH ?? path.join(__dirname, "../authority.json"),
  /** JSON array secret (Render/env) — preferred over file on disk in production. */
  authorityKeypairJson: process.env.AUTHORITY_KEYPAIR_JSON ?? "",
  allowedMints: [
    ...new Set(
      (process.env.ALLOWED_MINTS ?? "")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
    ),
  ],
  /** When true, server skips real on-chain escrow (opt-in via MOCK_ESCROW=true). */
  mockEscrow: process.env.MOCK_ESCROW === "true",
  /** Require SIWS session for wallet actions (always on in production). */
  requirePlayerAuth:
    process.env.REQUIRE_PLAYER_AUTH === "true" ||
    (process.env.REQUIRE_PLAYER_AUTH !== "false" && isProduction),
  playerSessionTtlMs: parseInt(
    process.env.PLAYER_SESSION_TTL_MS ??
      (isProduction ? String(3 * 24 * 60 * 60 * 1000) : String(7 * 24 * 60 * 60 * 1000)),
    10,
  ),
  corsOrigins,
  /** Primary origin (first in list) — legacy single-origin helpers */
  corsOrigin: corsOrigins[0] ?? "http://localhost:5173",
  clockMs: ONE_V_ONE_CLOCK_MS,
  /** Header `X-Admin-Token` / Bearer — legacy; prefer platform login sessions. */
  adminSecret: process.env.ADMIN_SECRET ?? "sol-ttt-dev-admin",
  adminApiKey: process.env.ADMIN_API_KEY ?? process.env.ADMIN_SECRET ?? "sol-ttt-dev-admin",
  adminWallets: (process.env.ADMIN_WALLETS ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean),
  adminPlatformsConfigPath: process.env.ADMIN_PLATFORMS_CONFIG ?? "",
  /** 3-step admin gate (email → Google → wallet). Required in production. */
  adminGateEmail: process.env.ADMIN_GATE_EMAIL ?? "",
  adminGateGoogleEmail: process.env.ADMIN_GATE_GOOGLE_EMAIL ?? "",
  adminGateWallet: process.env.ADMIN_GATE_WALLET ?? "",
  adminLegacyAuthEnabled:
    process.env.ADMIN_LEGACY_AUTH === "true" || !isProduction,
  /** Admin session lifetime (default 8h prod, 24h dev). */
  adminSessionTtlMs: parseInt(
    process.env.ADMIN_SESSION_TTL_MS ??
      (isProduction ? String(8 * 60 * 60 * 1000) : String(24 * 60 * 60 * 1000)),
    10,
  ),
  /** Google OAuth Client ID (mesmo valor que VITE_GOOGLE_CLIENT_ID no admin). */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  /** MongoDB Atlas (local + production). */
  mongodbUri:
    process.env.MONGODB_URI ??
    process.env.DATABASE_URL ??
    "",
  databaseProvider: "mongodb" as const,
  /** Spawn Stockfish casual bot tables in the open lobby list. */
  botCasualLobbiesEnabled:
    process.env.BOT_CASUAL_LOBBIES_ENABLED !== "false",
  /** Max simultaneous bot/guest ghost tables in the casual lobby. */
  botCasualMaxTables: Math.max(
    1,
    parseInt(process.env.BOT_CASUAL_MAX_TABLES ?? "8", 10),
  ),
  /** Minimum ghost tables when the server is lightly loaded. */
  botCasualMinTables: Math.max(
    0,
    parseInt(process.env.BOT_CASUAL_MIN_TABLES ?? "1", 10),
  ),
  /** Connected load score before bot tables start shrinking. */
  botLoadUsersBeforeReduce: Math.max(
    0,
    parseInt(process.env.BOT_LOAD_USERS_BEFORE_REDUCE ?? "15", 10),
  ),
  /** Each unit of load score above the threshold removes one bot table. */
  botLoadUsersPerTable: Math.max(
    1,
    parseInt(process.env.BOT_LOAD_USERS_PER_TABLE ?? "10", 10),
  ),
  /** At this many sockets, ghost bot tables are disabled entirely. */
  botLoadSoftSocketCap: Math.max(
    20,
    parseInt(process.env.BOT_LOAD_SOFT_SOCKET_CAP ?? "120", 10),
  ),
  /** Active bot matches count as this many load units (Stockfish cost). */
  botLoadBotMatchWeight: Math.max(
    1,
    parseInt(process.env.BOT_LOAD_BOT_MATCH_WEIGHT ?? "4", 10),
  ),
  /** Active human matches count as this many load units. */
  botLoadHumanMatchWeight: Math.max(
    0,
    parseInt(process.env.BOT_LOAD_HUMAN_MATCH_WEIGHT ?? "2", 10),
  ),
  /** Human waiting lobbies count as this many load units. */
  botLoadWaitingLobbyWeight: Math.max(
    0,
    parseInt(process.env.BOT_LOAD_WAITING_LOBBY_WEIGHT ?? "1", 10),
  ),
  /** How often to rotate which ghost personas host open tables. */
  botCasualRotationMs: Math.max(
    30_000,
    parseInt(process.env.BOT_CASUAL_ROTATION_MS ?? "90000", 10),
  ),
  /** Minimum age before an idle ghost table can be replaced. */
  botCasualMinTableAgeMs: Math.max(
    15_000,
    parseInt(process.env.BOT_CASUAL_MIN_TABLE_AGE_MS ?? "60000", 10),
  ),
};
