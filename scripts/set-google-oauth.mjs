#!/usr/bin/env node
/**
 * Grava o mesmo OAuth Client ID em apps/server/.env e apps/admin/.env.
 * Uso: node scripts/set-google-oauth.mjs SEU_ID.apps.googleusercontent.com
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const clientId = process.argv[2]?.trim();
if (!clientId || !clientId.endsWith(".apps.googleusercontent.com")) {
  console.error(
    "Uso: node scripts/set-google-oauth.mjs SEU_ID.apps.googleusercontent.com",
  );
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function upsertEnv(filePath, key, value) {
  const line = `${key}=${value}`;
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) {
    content = content.replace(re, line);
  } else {
    if (content.length && !content.endsWith("\n")) content += "\n";
    content += `\n# Google OAuth\n${line}\n`;
  }
  fs.writeFileSync(filePath, content);
  console.log(`✓ ${path.relative(root, filePath)} → ${key}`);
}

upsertEnv(path.join(root, "apps/server/.env"), "GOOGLE_CLIENT_ID", clientId);
upsertEnv(
  path.join(root, "apps/admin/.env"),
  "VITE_GOOGLE_CLIENT_ID",
  clientId,
);

console.log("\nReinicie o dev server: npm run dev:admin");
