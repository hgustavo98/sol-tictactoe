import { config } from "./config";
import { getAllSettings, setSetting } from "./db";
import {
  DEFAULT_MODE_AVAILABILITY,
  mergeModeAvailability,
  normalizeModeAvailabilityInput,
  parseModeAvailability,
  type ModeAvailabilityMap,
} from "@sol-tictactoe/shared";
import {
  inferSolanaCluster,
  parseSolanaCluster,
  type SolanaCluster,
} from "./solana-cluster";

export const SETTING_KEYS = {
  FEE_RECIPIENT: "fee_recipient_wallet",
  MOCK_ESCROW: "mock_escrow",
  HOUSE_RAKE_BPS: "house_rake_bps",
  PROGRAM_ID: "program_id",
  ACTIVE_CLUSTER: "active_solana_cluster",
  MODE_AVAILABILITY: "game_mode_availability",
} as const;

export interface RuntimeConfig {
  port: number;
  rpcUrl: string;
  solanaCluster: SolanaCluster;
  programId: string;
  houseRakeBps: number;
  feeRecipientWallet: string;
  authorityKeypairPath: string;
  allowedMints: string[];
  mockEscrow: boolean;
  corsOrigin: string;
  clockMs: number;
  adminSecret: string;
  adminWallets: string[];
}

let settingsCache: Record<string, string> = {};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

function parseIntSetting(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function defaultActiveCluster(): SolanaCluster {
  return config.solanaCluster;
}

function rpcUrlForCluster(cluster: SolanaCluster): string {
  if (cluster === "mainnet-beta") {
    return (
      process.env.MAINNET_RPC_URL?.trim() ||
      process.env.RPC_URL?.trim() ||
      "https://api.mainnet-beta.solana.com"
    );
  }
  if (cluster === "testnet") {
    return (
      process.env.TESTNET_RPC_URL?.trim() ||
      "https://api.testnet.solana.com"
    );
  }
  return (
    process.env.DEVNET_RPC_URL?.trim() ||
    process.env.RPC_URL?.trim() ||
    "https://api.devnet.solana.com"
  );
}

function resolveActiveCluster(): SolanaCluster {
  const fromDb = parseSolanaCluster(settingsCache[SETTING_KEYS.ACTIVE_CLUSTER]);
  if (fromDb && fromDb !== "testnet") return fromDb;
  return defaultActiveCluster();
}

export function getModeAvailability(): ModeAvailabilityMap {
  return parseModeAvailability(settingsCache[SETTING_KEYS.MODE_AVAILABILITY]);
}

export async function refreshSettingsCache(): Promise<void> {
  settingsCache = await getAllSettings();
}

/** Effective config: env defaults overridden by DB app_settings (cached). */
export function getRuntimeConfig(): RuntimeConfig {
  const dbFee = settingsCache[SETTING_KEYS.FEE_RECIPIENT];
  const dbMock = settingsCache[SETTING_KEYS.MOCK_ESCROW];
  const dbRake = settingsCache[SETTING_KEYS.HOUSE_RAKE_BPS];
  const dbProgram = settingsCache[SETTING_KEYS.PROGRAM_ID];
  const activeCluster = resolveActiveCluster();
  const basicDeploy = process.env.BASIC_DEPLOY === "true";
  const mockEscrowRaw = parseBool(dbMock, config.mockEscrow);

  return {
    ...config,
    rpcUrl: rpcUrlForCluster(activeCluster),
    solanaCluster: activeCluster,
    programId: dbProgram || config.programId,
    houseRakeBps: parseIntSetting(dbRake, config.houseRakeBps),
    feeRecipientWallet: dbFee ?? config.feeRecipientWallet,
    mockEscrow: config.isProduction && !basicDeploy ? false : mockEscrowRaw,
  };
}

export async function seedSettingsFromEnv(): Promise<void> {
  const existing = await getAllSettings();

  if (process.env.MOCK_ESCROW !== undefined || !existing[SETTING_KEYS.MOCK_ESCROW]) {
    await setSetting(SETTING_KEYS.MOCK_ESCROW, String(config.mockEscrow));
  }
  if (!existing[SETTING_KEYS.HOUSE_RAKE_BPS]) {
    await setSetting(SETTING_KEYS.HOUSE_RAKE_BPS, String(config.houseRakeBps));
  }
  if (!existing[SETTING_KEYS.PROGRAM_ID]) {
    await setSetting(SETTING_KEYS.PROGRAM_ID, config.programId);
  }
  if (!existing[SETTING_KEYS.ACTIVE_CLUSTER]) {
    const seedCluster =
      parseSolanaCluster(process.env.LAUNCH_CLUSTER) ?? config.solanaCluster;
    await setSetting(SETTING_KEYS.ACTIVE_CLUSTER, seedCluster);
  }

  if (config.feeRecipientWallet) {
    if (
      process.env.FEE_RECIPIENT_WALLET !== undefined ||
      !existing[SETTING_KEYS.FEE_RECIPIENT]
    ) {
      await setSetting(SETTING_KEYS.FEE_RECIPIENT, config.feeRecipientWallet);
    }
  } else if (!existing[SETTING_KEYS.FEE_RECIPIENT]) {
    try {
      const { getAuthorityPublicKey } = await import("./escrow-client");
      await setSetting(SETTING_KEYS.FEE_RECIPIENT, getAuthorityPublicKey());
    } catch {
      // authority keypair missing — init-escrow / deploy flow must configure it
    }
  }

  if (!existing[SETTING_KEYS.MODE_AVAILABILITY]) {
    await setSetting(
      SETTING_KEYS.MODE_AVAILABILITY,
      JSON.stringify(DEFAULT_MODE_AVAILABILITY),
    );
  }

  await refreshSettingsCache();
}

export async function updateRuntimeSettings(
  input: Partial<{
    feeRecipientWallet: string;
    mockEscrow: boolean;
    houseRakeBps: number;
    programId: string;
    activeCluster: SolanaCluster;
    gameModeAvailability: Partial<ModeAvailabilityMap>;
  }>,
): Promise<RuntimeConfig> {
  if (input.mockEscrow === true && config.isProduction) {
    throw new Error("mockEscrow cannot be enabled in production");
  }
  if (input.feeRecipientWallet !== undefined) {
    await setSetting(SETTING_KEYS.FEE_RECIPIENT, input.feeRecipientWallet.trim());
  }
  if (input.mockEscrow !== undefined) {
    await setSetting(SETTING_KEYS.MOCK_ESCROW, String(input.mockEscrow));
  }
  if (input.houseRakeBps !== undefined) {
    await setSetting(SETTING_KEYS.HOUSE_RAKE_BPS, String(input.houseRakeBps));
  }
  if (input.programId !== undefined) {
    await setSetting(SETTING_KEYS.PROGRAM_ID, input.programId.trim());
  }
  if (input.activeCluster !== undefined) {
    await setSetting(SETTING_KEYS.ACTIVE_CLUSTER, input.activeCluster);
    const { clearEscrowDiagnosticsCache } = await import("./escrow-status");
    clearEscrowDiagnosticsCache();
  }
  if (input.gameModeAvailability !== undefined) {
    const patch = normalizeModeAvailabilityInput(
      input.gameModeAvailability as Partial<Record<string, string>>,
    );
    const next = mergeModeAvailability(getModeAvailability(), patch);
    await setSetting(SETTING_KEYS.MODE_AVAILABILITY, JSON.stringify(next));
  }
  await refreshSettingsCache();
  return getRuntimeConfig();
}

/** Cluster inferred from env only (ignores admin DB toggle). */
export function getEnvSolanaCluster(): SolanaCluster {
  return inferSolanaCluster(config.rpcUrl, process.env.LAUNCH_CLUSTER);
}
