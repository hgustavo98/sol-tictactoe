/**
 * Enable Web Analytics + Speed Insights on the Vercel project.
 * Usage: node scripts/vercel-enable-insights.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const secretsPath = path.join(root, "docs/secrets.local.env");

function loadSecrets() {
  if (!fs.existsSync(secretsPath)) {
    console.error(`Missing ${secretsPath}`);
    process.exit(1);
  }
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

async function vercelFetch(token, method, urlPath, body) {
  const res = await fetch(`https://api.vercel.com${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

const secrets = loadSecrets();
const token = secrets.VERCEL_TOKEN;
const projectId = secrets.VERCEL_PROJECT_ID ?? secrets.VERCEL_PROJECT_WEB;

if (!token) {
  console.error("Set VERCEL_TOKEN in docs/secrets.local.env");
  process.exit(1);
}

let resolvedProjectId = projectId;

if (!resolvedProjectId && secrets.VERCEL_ORG_ID) {
  const projects = await vercelFetch(
    token,
    "GET",
    `/v9/projects?teamId=${encodeURIComponent(secrets.VERCEL_ORG_ID)}&limit=20`,
  );
  const match =
    projects?.projects?.find((p) =>
      /sol.?chess|chess/i.test(p.name ?? ""),
    ) ?? projects?.projects?.[0];
  resolvedProjectId = match?.id;
  if (match?.name) {
    console.log(`[vercel] Using project ${match.name} (${resolvedProjectId})`);
  }
}

if (!resolvedProjectId) {
  console.error("Set VERCEL_PROJECT_ID in docs/secrets.local.env");
  process.exit(1);
}

const query = `projectId=${encodeURIComponent(resolvedProjectId)}`;

const web = await vercelFetch(token, "POST", `/v1/web/insights/toggle?${query}`, {
  value: true,
});
const speed = await vercelFetch(token, "POST", `/v1/speed-insights/toggle?${query}`, {
  value: true,
});

console.log(
  JSON.stringify({
    ok: true,
    projectId: resolvedProjectId,
    webAnalytics: web?.value ?? true,
    speedInsights: speed?.value ?? true,
  }),
);
