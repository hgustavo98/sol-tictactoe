import { randomUUID } from "crypto";
import { config } from "../config";
import {
  deleteAdminSession,
  getAdminSession,
  logAdminAction,
} from "../db";
import { getPlatform } from "./platforms";
import {
  createWalletChallenge as storeWalletChallenge,
  verifyWalletSignature,
} from "./admin-auth-shared";
import { issueAdminSession } from "./admin-session";

export function createWalletChallenge(wallet: string): {
  nonce: string;
  message: string;
  expiresAt: number;
} {
  const nonce = randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const message = [
    "SOL TTT Admin Login",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
  ].join("\n");
  return storeWalletChallenge(nonce, message, expiresAt, wallet);
}

export async function loginWithPlatform(input: {
  platformId: string;
  apiKey?: string;
  wallet?: string;
  signature?: string;
  nonce?: string;
}): Promise<{ token: string; expiresAt: number; actor: string; platformId: string }> {
  const platform = getPlatform(input.platformId);
  if (!platform) {
    throw new Error("Platform not found or disabled");
  }

  if (platform.type === "api_key") {
    const expected = config.adminApiKey || config.adminSecret;
    if (!input.apiKey || input.apiKey !== expected) {
      throw new Error("Invalid API key");
    }
    const session = await issueAdminSession(platform.id, "api_key");
    await logAdminAction("admin_login", { platform: platform.id }, "api_key");
    return { ...session, actor: "api_key", platformId: platform.id };
  }

  if (platform.type === "solana_wallet") {
    if (!input.wallet || !input.signature || !input.nonce) {
      throw new Error("wallet, signature and nonce are required");
    }

    const result = verifyWalletSignature(
      input.wallet,
      input.signature,
      input.nonce,
    );
    if (!result.valid) {
      throw new Error(result.error ?? "Invalid wallet signature");
    }

    const allowlist = [
      ...new Set([...(platform.allowlist ?? []), ...config.adminWallets]),
    ];
    if (allowlist.length === 0 || !allowlist.includes(input.wallet)) {
      throw new Error("Wallet not authorized for admin");
    }

    const session = await issueAdminSession(platform.id, input.wallet);
    await logAdminAction(
      "admin_login",
      { platform: platform.id, wallet: input.wallet },
      input.wallet,
    );
    return {
      ...session,
      actor: input.wallet,
      platformId: platform.id,
    };
  }

  throw new Error("Unsupported platform type");
}

export async function resolveSession(
  token: string | undefined,
): Promise<{ actor: string; platformId: string } | null> {
  if (!token) return null;
  const session = await getAdminSession(token);
  if (!session) return null;
  return { actor: session.actor, platformId: session.platformId };
}

export async function logoutSession(token: string): Promise<void> {
  await deleteAdminSession(token);
}
