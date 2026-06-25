/**
 * Builds the game + admin into a single Vercel output (apps/web/dist).
 * Admin: https://sol-ttt.xyz/<secret-path>/
 *
 * VITE_ADMIN_BASE_PATH in Vercel must match root vercel.json rewrites.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { adminPathSegment, normalizeAdminBase } from "./admin-base-path.mjs";
import { normalizeViteEnv } from "./ensure-https-url.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const adminBase = normalizeAdminBase(process.env.VITE_ADMIN_BASE_PATH);
const adminSegment = adminPathSegment(adminBase);

function normSource(source) {
  return String(source).replace(/^\//, "");
}

function isAdminRewrite(source, destination) {
  const src = normSource(source);
  const dest = String(destination ?? "");
  if (src.startsWith("api/") || src === "config" || src === "health") return false;
  if (src === "assets/:path*" || src === "models/:path*" || src === "(.*)") return false;
  if (dest.endsWith("/index.html")) return true;
  if (src.endsWith("/:path*")) {
    const prefix = src.slice(0, -":path*".length).replace(/\/$/, "");
    return prefix.length > 0 && !prefix.includes("/");
  }
  return !src.includes("/") && !src.includes(":");
}

function syncAdminRewrites(vercelConfig, segment) {
  const rewrites = (vercelConfig.rewrites ?? []).filter(
    (r) => !isAdminRewrite(r.source, r.destination),
  );
  const apiRewrites = rewrites.filter((r) => {
    const src = normSource(r.source);
    return src.startsWith("api/") || src === "config" || src === "health";
  });
  const staticRewrites = rewrites.filter((r) => {
    const src = normSource(r.source);
    return src === "assets/:path*" || src === "models/:path*" || src === "(.*)";
  });
  vercelConfig.rewrites = [
    ...apiRewrites,
    { source: `/${segment}`, destination: `/${segment}/index.html` },
    { source: `/${segment}/:path*`, destination: `/${segment}/:path*` },
    ...staticRewrites,
  ];
}

const vercelConfig = JSON.parse(
  readFileSync(path.join(root, "vercel.json"), "utf-8"),
);
syncAdminRewrites(vercelConfig, adminSegment);
writeFileSync(path.join(root, "vercel.json"), `${JSON.stringify(vercelConfig, null, 2)}\n`);

console.log(`[build] Admin base path: ${adminBase}`);

const buildEnv = normalizeViteEnv(process.env);

execSync("npm run build -w @sol-tictactoe/shared", { cwd: root, stdio: "inherit" });

execSync("npm run build -w @sol-tictactoe/web", {
  cwd: root,
  stdio: "inherit",
  env: buildEnv,
});

execSync("npm run build -w @sol-tictactoe/admin", {
  cwd: root,
  stdio: "inherit",
  env: { ...buildEnv, VITE_ADMIN_BASE_PATH: adminBase },
});

const webDist = path.join(root, "apps/web/dist");
const adminDist = path.join(root, "apps/admin/dist");
const adminOut = path.join(webDist, adminSegment);

rmSync(adminOut, { recursive: true, force: true });
mkdirSync(adminOut, { recursive: true });
cpSync(adminDist, adminOut, { recursive: true });

console.log("[build] Done → apps/web/dist");
