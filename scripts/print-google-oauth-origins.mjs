#!/usr/bin/env node
/**
 * Lista origens que devem estar no Google Cloud Console (OAuth 2.0 Client ID).
 * O path do admin (/r8n4x2k7m9p3/) NÃO entra — só o domínio (origin).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DEFAULT_ADMIN_BASE_PATH } from "./admin-base-path.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(filePath, key) {
  if (!fs.existsSync(filePath)) return undefined;
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1 || trimmed.slice(0, eq).trim() !== key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

const corsRaw =
  process.env.CORS_ORIGIN ??
  readEnv(path.join(root, "docs/render.deploy.env"), "CORS_ORIGIN") ??
  readEnv(path.join(root, "docs/secrets.local.env"), "CORS_ORIGIN") ??
  "https://sol-tictactoe.vercel.app,http://localhost:5173,http://localhost:5174";

const publicUrl =
  process.env.VITE_PUBLIC_APP_URL ??
  readEnv(path.join(root, "docs/vercel.production.env"), "VITE_PUBLIC_APP_URL") ??
  "https://sol-tictactoe.vercel.app";

const clientId =
  process.env.GOOGLE_CLIENT_ID ??
  readEnv(path.join(root, "docs/render.deploy.env"), "GOOGLE_CLIENT_ID") ??
  readEnv(path.join(root, "apps/server/.env"), "GOOGLE_CLIENT_ID") ??
  "(não definido)";

const adminPath =
  process.env.VITE_ADMIN_BASE_PATH ??
  readEnv(path.join(root, "docs/vercel.production.env"), "VITE_ADMIN_BASE_PATH") ??
  DEFAULT_ADMIN_BASE_PATH;

const origins = new Set();
for (const part of corsRaw.split(",")) {
  const raw = part.trim();
  if (!raw) continue;
  try {
    origins.add(new URL(raw).origin);
  } catch {
    /* skip */
  }
}
try {
  origins.add(new URL(publicUrl).origin);
} catch {
  /* skip */
}

const adminUrl = `${publicUrl.replace(/\/$/, "")}${adminPath.startsWith("/") ? adminPath : `/${adminPath}`}`;

console.log("\n=== Google OAuth — Authorized JavaScript origins ===\n");
console.log("Console: https://console.cloud.google.com/apis/credentials\n");
console.log(`Client ID: ${clientId}\n`);
console.log("Adicione TODAS estas origens (sem path no final):\n");
for (const o of [...origins].sort()) {
  console.log(`  • ${o}`);
}
console.log("\nAdmin URL (mesma origin acima — path não vai no Google):\n");
console.log(`  ${adminUrl}\n`);
console.log(
  "Se usar um alias Vercel extra, adicione também essa origin.\n",
);
