import fs from "fs";
import { config } from "./config";

const DEV_ADMIN_SECRET = "sol-ttt-dev-admin";

function hasLocalhostCorsOnly(): boolean {
  return config.corsOrigins.every(
    (origin) =>
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("[::1]"),
  );
}

export function runProductionStartupChecks(): void {
  if (!config.isProduction) return;

  const basicMode = process.env.BASIC_DEPLOY === "true";
  const errors: string[] = [];

  if (config.mockEscrow && !basicMode) {
    errors.push("MOCK_ESCROW must be false in production (or set BASIC_DEPLOY=true)");
  }

  if (!config.requirePlayerAuth && !basicMode) {
    errors.push("REQUIRE_PLAYER_AUTH must be true in production (or set BASIC_DEPLOY=true)");
  }

  if (
    config.adminSecret === DEV_ADMIN_SECRET ||
    config.adminApiKey === DEV_ADMIN_SECRET
  ) {
    if (!basicMode) {
      errors.push("ADMIN_SECRET / ADMIN_API_KEY must not use the dev default in production");
    }
  }

  if (!basicMode) {
    if (!config.adminGateEmail.trim()) {
      errors.push("ADMIN_GATE_EMAIL is required in production");
    }
    if (!config.adminGateGoogleEmail.trim()) {
      errors.push("ADMIN_GATE_GOOGLE_EMAIL is required in production");
    }
    if (!config.adminGateWallet.trim()) {
      errors.push("ADMIN_GATE_WALLET is required in production");
    }
    if (!config.googleClientId.trim()) {
      errors.push("GOOGLE_CLIENT_ID is required in production");
    }
  }

  if (config.adminLegacyAuthEnabled) {
    errors.push(
      "ADMIN_LEGACY_AUTH must not be true in production — use the 3-step admin gate only",
    );
  }

  if (!config.feeRecipientWallet.trim() && !basicMode && !config.mockEscrow) {
    errors.push("FEE_RECIPIENT_WALLET is required in production");
  }

  if (hasLocalhostCorsOnly()) {
    errors.push("CORS_ORIGIN must include your production web/admin domains");
  }

  if (
    !basicMode &&
    !config.mockEscrow &&
    !config.authorityKeypairJson.trim() &&
    !fs.existsSync(config.authorityKeypairPath)
  ) {
    errors.push(
      "AUTHORITY_KEYPAIR_JSON or AUTHORITY_KEYPAIR_PATH is required in production",
    );
  }

  if (!config.mongodbUri.trim()) {
    errors.push("MONGODB_URI is required in production");
  }

  if (!config.trustProxy) {
    errors.push(
      "TRUST_PROXY should be true in production behind Render/Cloudflare (set TRUST_PROXY=true)",
    );
  }

  if (errors.length > 0) {
    console.error("[startup] Production configuration errors:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}
