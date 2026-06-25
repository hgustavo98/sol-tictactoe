/**
 * Sync PROGRAM_ID across anchor.toml, Rust declare_id, and env examples.
 *
 * Usage: node scripts/sync-program-id.mjs AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const programId = process.argv[2]?.trim();

if (!programId || programId.length < 32) {
  console.error("Usage: node scripts/sync-program-id.mjs <PROGRAM_ID>");
  process.exit(1);
}

function replaceInFile(relPath, replacers) {
  const full = path.join(root, relPath);
  let content = fs.readFileSync(full, "utf-8");
  for (const [pattern, replacement] of replacers) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(full, content);
}

replaceInFile("programs/match-escrow/src/lib.rs", [
  [/declare_id!\("[^"]+"\)/, `declare_id!("${programId}")`],
]);

replaceInFile("anchor.toml", [
  [/match_escrow = "[^"]+"/g, `match_escrow = "${programId}"`],
]);

for (const envFile of [
  "apps/server/.env.example",
  "apps/web/.env.example",
  "docs/secrets.local.env.example",
]) {
  replaceInFile(envFile, [
    [/PROGRAM_ID=.+/g, `PROGRAM_ID=${programId}`],
    [/VITE_PROGRAM_ID=.+/g, `VITE_PROGRAM_ID=${programId}`],
  ]);
}

console.log(`[sync-program-id] Updated to ${programId}`);
