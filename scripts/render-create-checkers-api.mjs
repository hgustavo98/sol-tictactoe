/**
 * Create sol-ttt-api on Render (once) and print service id + URL.
 * Usage: node scripts/render-create-checkers-api.mjs
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
if (!API_KEY) {
  console.error("Set RENDER_API_KEY in docs/secrets.local.env");
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
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${text.slice(0, 800)}`);
  }
  return text ? JSON.parse(text) : null;
}

const list = await renderFetch("GET", "/services?limit=50");
for (const item of list ?? []) {
  const s = item.service ?? item;
  if (s.name === "sol-ttt-api") {
    console.log(
      JSON.stringify({
        ok: true,
        existing: true,
        id: s.id,
        url: s.serviceDetails?.url,
      }),
    );
    process.exit(0);
  }
}

const ownerId = "tea-d8s206urnols7383i0r0";
const created = await renderFetch("POST", "/services", {
  type: "web_service",
  name: "sol-ttt-api",
  ownerId,
  repo: "https://github.com/hgustavo98/sol-tictactoe",
  autoDeploy: "yes",
  branch: "main",
  serviceDetails: {
    env: "docker",
    envSpecificDetails: {
      dockerfilePath: "./Dockerfile",
    },
    plan: "free",
    region: "oregon",
    healthCheckPath: "/health",
  },
});

const s = created.service ?? created;
console.log(
  JSON.stringify({
    ok: true,
    existing: false,
    id: s.id,
    url: s.serviceDetails?.url,
  }),
);
