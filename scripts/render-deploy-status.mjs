/**
 * Poll latest Render deploy until live or failed.
 * Usage: node scripts/render-deploy-status.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const secretsPath = path.join(root, "docs/secrets.local.env");

function loadSecrets() {
  const env = {};
  for (const line of fs.readFileSync(secretsPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const secrets = loadSecrets();
const API_KEY = secrets.RENDER_API_KEY;
const SERVICE_ID = secrets.RENDER_SERVICE_ID ?? "srv-d8s2afe7r5hc73euqts0";

async function renderFetch(urlPath) {
  const res = await fetch(`https://api.render.com/v1${urlPath}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${urlPath} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const list = await renderFetch(`/services/${SERVICE_ID}/deploys?limit=1`);
const deploy = list[0]?.deploy ?? list[0];
if (!deploy?.id) {
  console.log(JSON.stringify({ ok: false, error: "no deploy found" }));
  process.exit(1);
}

console.log(`[render] Watching deploy ${deploy.id} (initial: ${deploy.status})`);

for (let i = 0; i < 60; i++) {
  const current = await renderFetch(`/services/${SERVICE_ID}/deploys/${deploy.id}`);
  const d = current.deploy ?? current;
  const status = d.status;
  process.stdout.write(`\r[render] ${status} (${i + 1}/60)`);
  if (status === "live") {
    console.log("\n[render] Deploy live.");
    process.exit(0);
  }
  if (status === "build_failed" || status === "update_failed" || status === "canceled") {
    console.log(`\n[render] Deploy failed: ${status}`);
    process.exit(1);
  }
  await sleep(15_000);
}

console.log("\n[render] Timed out waiting for deploy");
process.exit(2);
