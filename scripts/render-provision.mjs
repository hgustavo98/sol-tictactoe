/**
 * Provision Render service env + secret files from docs/secrets.local.env
 * Usage: node scripts/render-provision.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const secretsPath = path.join(root, "docs/secrets.local.env");
const authorityPath = path.join(root, "apps/server/authority.json");

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
const SERVICE_ID =
  process.env.RENDER_SERVICE_ID ??
  secrets.RENDER_CHECKERS_SERVICE_ID ??
  secrets.RENDER_SERVICE_ID ??
  "srv-d8s2afe7r5hc73euqts0";
const API_KEY = process.env.RENDER_API_KEY ?? secrets.RENDER_API_KEY;

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
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

async function main() {
  if (!API_KEY) {
    console.error("Set RENDER_API_KEY");
    process.exit(1);
  }

  const heliusKey = secrets.RPC_URL?.match(/api-key=([^&]+)/)?.[1] ?? "";
  const mainnetRpc = heliusKey
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
    : secrets.RPC_URL;

  const envVars = [
    { key: "NODE_ENV", value: "production" },
    { key: "BASIC_DEPLOY", value: "true" },
    { key: "LAUNCH_CLUSTER", value: "devnet" },
    { key: "MOCK_ESCROW", value: "true" },
    { key: "REQUIRE_PLAYER_AUTH", value: "false" },
    { key: "HOUSE_RAKE_BPS", value: secrets.HOUSE_RAKE_BPS ?? "300" },
    {
      key: "CORS_ORIGIN",
      value:
        secrets.CORS_ORIGIN ??
        "https://sol-tictactoe.vercel.app,https://sol-ttt.vercel.app",
    },
    {
      key: "AUTHORITY_KEYPAIR_PATH",
      value: "/etc/secrets/authority.json",
    },
    {
      key: "FEE_WALLET_KEYPAIR_PATH",
      value: "/etc/secrets/fee-wallet.json",
    },
    {
      key: "ADMIN_PLATFORMS_CONFIG",
      value: "./apps/server/admin-platforms.json",
    },
    { key: "DEVNET_RPC_URL", value: "https://api.devnet.solana.com" },
    { key: "MAINNET_RPC_URL", value: mainnetRpc },
    { key: "TRUST_PROXY", value: "true" },
    { key: "RPC_URL", value: "https://api.devnet.solana.com" },
    { key: "PROGRAM_ID", value: secrets.PROGRAM_ID },
    { key: "FEE_RECIPIENT_WALLET", value: secrets.FEE_RECIPIENT_WALLET },
    { key: "ADMIN_GATE_EMAIL", value: secrets.ADMIN_GATE_EMAIL },
    { key: "ADMIN_GATE_GOOGLE_EMAIL", value: secrets.ADMIN_GATE_GOOGLE_EMAIL },
    { key: "ADMIN_GATE_WALLET", value: secrets.ADMIN_GATE_WALLET },
    { key: "GOOGLE_CLIENT_ID", value: secrets.GOOGLE_CLIENT_ID },
    { key: "ADMIN_SECRET", value: secrets.ADMIN_SECRET },
    { key: "ADMIN_API_KEY", value: secrets.ADMIN_SECRET },
    { key: "MONGODB_URI", value: secrets.MONGODB_URI },
  ];

  console.log("[render] Updating env vars...");
  await renderFetch("PUT", `/services/${SERVICE_ID}/env-vars`, envVars);

  if (fs.existsSync(authorityPath)) {
    const authorityContent = fs.readFileSync(authorityPath, "utf-8").trim();

    console.log("[render] Uploading authority.json secret file...");
    try {
      await renderFetch("POST", `/services/${SERVICE_ID}/secret-files`, {
        name: "/etc/secrets/authority.json",
        content: authorityContent,
      });
    } catch (err) {
      const msg = String(err);
      if (msg.includes("409") || msg.includes("already exists")) {
        const files = await renderFetch("GET", `/services/${SERVICE_ID}/secret-files`);
        const existing = files.find?.((f) => f.name === "/etc/secrets/authority.json")
          ?? files?.[0]?.secretFile;
        const id = existing?.id ?? existing?.secretFile?.id;
        if (id) {
          await renderFetch("PUT", `/services/${SERVICE_ID}/secret-files/${id}`, {
            content: authorityContent,
          });
        } else {
          console.warn("[render] Could not update authority secret file:", msg);
        }
      } else {
        console.warn("[render] Skipping authority secret file upload:", msg.slice(0, 200));
      }
    }
  } else {
    console.log("[render] Skipping authority.json (BASIC_DEPLOY / file missing)");
  }

  console.log("[render] Triggering deploy...");
  await renderFetch("POST", `/services/${SERVICE_ID}/deploys`, {
    clearCache: "clear",
  });

  console.log("[render] Done.");
}

main().catch((err) => {
  console.error("[render]", err.message ?? err);
  process.exit(1);
});
