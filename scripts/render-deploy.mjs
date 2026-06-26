/**
 * Trigger a Render deploy for sol-ttt-api.
 * Usage: node scripts/render-deploy.mjs
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
const SERVICE_ID =
  process.env.RENDER_SERVICE_ID ??
  secrets.RENDER_TTT_SERVICE_ID ??
  secrets.RENDER_SERVICE_ID;

if (!API_KEY) {
  console.error("Set RENDER_API_KEY in docs/secrets.local.env");
  process.exit(1);
}

if (!SERVICE_ID) {
  console.error("Set RENDER_TTT_SERVICE_ID (run scripts/render-create-checkers-api.mjs first)");
  process.exit(1);
}

async function renderFetch(method, urlPath, body) {
  const res = await fetch(`https://api.render.com/v1${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

const result = await renderFetch("POST", `/services/${SERVICE_ID}/deploys`, {
  clearCache: "clear",
});

const deploy = result?.deploy ?? result;
console.log(
  JSON.stringify({
    ok: true,
    serviceId: SERVICE_ID,
    deployId: deploy?.id,
    status: deploy?.status,
  }),
);
