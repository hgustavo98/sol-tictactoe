import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [join(dir, "smoke-escrow.mjs")], {
  stdio: "inherit",
  env: { ...process.env, SMOKE_PROFILE: "mainnet" },
});

process.exit(result.status ?? 1);
