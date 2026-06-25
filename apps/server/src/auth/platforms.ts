import fs from "fs";
import path from "path";
import { config } from "../config";

export type AdminPlatformType = "api_key" | "solana_wallet";

export interface AdminPlatformDefinition {
  id: string;
  type: AdminPlatformType;
  enabled: boolean;
  label: string;
  /** Wallet allowlist for solana_wallet platform */
  allowlist?: string[];
}

export interface AdminPlatformsFile {
  platforms: AdminPlatformDefinition[];
}

const DEFAULT_PLATFORMS: AdminPlatformsFile = {
  platforms: [
    {
      id: "local",
      type: "api_key",
      enabled: true,
      label: "API Key",
    },
    {
      id: "wallet",
      type: "solana_wallet",
      enabled: false,
      label: "Solana Wallet",
      allowlist: [],
    },
  ],
};

let platformsCache: AdminPlatformDefinition[] | null = null;

function resolvePlatformsPath(): string | null {
  if (config.adminPlatformsConfigPath) {
    return path.isAbsolute(config.adminPlatformsConfigPath)
      ? config.adminPlatformsConfigPath
      : path.join(process.cwd(), config.adminPlatformsConfigPath);
  }
  const bundled = path.join(__dirname, "../admin-platforms.json");
  if (fs.existsSync(bundled)) return bundled;
  return null;
}

export function loadAdminPlatforms(): AdminPlatformDefinition[] {
  if (platformsCache) return platformsCache;

  const filePath = resolvePlatformsPath();
  let file: AdminPlatformsFile = DEFAULT_PLATFORMS;

  if (filePath && fs.existsSync(filePath)) {
    try {
      file = JSON.parse(fs.readFileSync(filePath, "utf-8")) as AdminPlatformsFile;
    } catch (err) {
      console.warn("[auth] Failed to parse admin platforms file, using defaults", err);
    }
  }

  const envAllowlist = config.adminWallets;
  platformsCache = file.platforms
    .filter((p) => p.enabled)
    .map((p) => {
      if (p.type === "solana_wallet" && envAllowlist.length > 0) {
        return {
          ...p,
          allowlist: [...new Set([...(p.allowlist ?? []), ...envAllowlist])],
        };
      }
      return p;
    });

  return platformsCache;
}

export function getPublicPlatforms(): Pick<
  AdminPlatformDefinition,
  "id" | "type" | "label"
>[] {
  return loadAdminPlatforms().map(({ id, type, label }) => ({ id, type, label }));
}

export function getPlatform(id: string): AdminPlatformDefinition | undefined {
  return loadAdminPlatforms().find((p) => p.id === id);
}

export function reloadAdminPlatforms(): void {
  platformsCache = null;
  loadAdminPlatforms();
}
