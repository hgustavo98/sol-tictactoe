import { randomBytes, randomUUID } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { logAdminAction } from "../db";
import { createWalletChallenge as storeWalletChallenge, verifyWalletSignature } from "./admin-auth-shared";
import { issueAdminSession } from "./admin-session";

const FLOW_TTL_MS = 15 * 60 * 1000;

interface GateFlow {
  email: string;
  googleEmail?: string;
  emailVerified: boolean;
  googleVerified: boolean;
  expiresAt: number;
}

const gateFlows = new Map<string, GateFlow>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function pruneExpiredFlows(): void {
  const now = Date.now();
  for (const [token, flow] of gateFlows) {
    if (flow.expiresAt < now) gateFlows.delete(token);
  }
}

function oauthOriginsFromCors(origins: string[]): string[] {
  const out = new Set<string>();
  for (const raw of origins) {
    try {
      out.add(new URL(raw).origin);
    } catch {
      /* ignore malformed entries */
    }
  }
  return [...out].sort();
}

export function getAdminGatePublicConfig() {
  const oauthOrigins = oauthOriginsFromCors(config.corsOrigins);
  return {
    googleClientId: config.googleClientId || null,
    /** Register these in Google Cloud → Credentials → OAuth client → Authorized JavaScript origins. */
    oauthOrigins,
    steps: ["email", "google", "wallet"] as const,
  };
}

export function verifyGateEmail(email: string): { flowToken: string; step: 2 } {
  if (!config.adminGateEmail.trim()) {
    throw new Error("Admin gate is not configured on the server");
  }
  pruneExpiredFlows();
  const normalized = normalizeEmail(email);
  if (normalized !== normalizeEmail(config.adminGateEmail)) {
    throw new Error("E-mail não autorizado");
  }

  const flowToken = randomBytes(32).toString("hex");
  gateFlows.set(flowToken, {
    email: normalized,
    emailVerified: true,
    googleVerified: false,
    expiresAt: Date.now() + FLOW_TTL_MS,
  });

  return { flowToken, step: 2 };
}

async function verifyGoogleIdToken(
  idToken: string,
): Promise<{ email: string; email_verified: boolean }> {
  if (!config.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID não configurado no servidor");
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    throw new Error("Token Google inválido ou expirado");
  }

  const data = (await res.json()) as {
    email?: string;
    email_verified?: string | boolean;
    aud?: string;
  };

  if (data.aud !== config.googleClientId) {
    throw new Error("Token Google não corresponde a este app");
  }

  const verified =
    data.email_verified === true || data.email_verified === "true";
  if (!verified || !data.email) {
    throw new Error("Conta Google sem e-mail verificado");
  }

  return { email: data.email, email_verified: verified };
}

export async function verifyGateGoogle(
  flowToken: string,
  idToken: string,
): Promise<{ flowToken: string; step: 3 }> {
  pruneExpiredFlows();
  const flow = gateFlows.get(flowToken);
  if (!flow?.emailVerified || flow.expiresAt < Date.now()) {
    throw new Error("Sessão de login expirada — reinicie pelo e-mail");
  }

  const google = await verifyGoogleIdToken(idToken);
  if (normalizeEmail(google.email) !== normalizeEmail(config.adminGateGoogleEmail)) {
    throw new Error("Conta Google não autorizada");
  }

  flow.googleEmail = normalizeEmail(google.email);
  flow.googleVerified = true;
  return { flowToken, step: 3 };
}

/** @deprecated use verifyGateGoogle with idToken */
export function verifyGateGoogleEmail(
  flowToken: string,
  googleEmail: string,
): { flowToken: string; step: 3 } {
  pruneExpiredFlows();
  const flow = gateFlows.get(flowToken);
  if (!flow?.emailVerified || flow.expiresAt < Date.now()) {
    throw new Error("Sessão de login expirada — reinicie pelo e-mail");
  }

  const normalized = normalizeEmail(googleEmail);
  if (normalized !== normalizeEmail(config.adminGateGoogleEmail)) {
    throw new Error("Conta Google não autorizada");
  }

  flow.googleEmail = normalized;
  flow.googleVerified = true;
  return { flowToken, step: 3 };
}

export function createGateWalletChallenge(
  flowToken: string,
  wallet: string,
): { nonce: string; message: string; expiresAt: number } {
  pruneExpiredFlows();
  const flow = gateFlows.get(flowToken);
  if (!flow?.googleVerified || flow.expiresAt < Date.now()) {
    throw new Error("Complete e-mail e Google antes da carteira");
  }

  new PublicKey(wallet);
  if (wallet !== config.adminGateWallet) {
    throw new Error("Carteira não autorizada para admin");
  }

  const nonce = randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const message = [
    "Tactoe Admin Gate",
    `Email: ${flow.email}`,
    flow.googleEmail ? `Google: ${flow.googleEmail}` : undefined,
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return storeWalletChallenge(nonce, message, expiresAt, wallet);
}

export async function completeGateLogin(input: {
  flowToken: string;
  wallet: string;
  signature: string;
  nonce: string;
}): Promise<{ token: string; expiresAt: number; actor: string; platformId: string }> {
  pruneExpiredFlows();
  const flow = gateFlows.get(input.flowToken);
  if (!flow?.googleVerified || flow.expiresAt < Date.now()) {
    throw new Error("Sessão de login expirada");
  }

  if (input.wallet !== config.adminGateWallet) {
    throw new Error("Carteira não autorizada");
  }

  const challenge = verifyWalletSignature(
    input.wallet,
    input.signature,
    input.nonce,
  );
  if (!challenge.valid) {
    throw new Error(challenge.error ?? "Assinatura inválida");
  }

  gateFlows.delete(input.flowToken);

  const session = await issueAdminSession("admin-gate", input.wallet);
  await logAdminAction(
    "admin_login",
    {
      platform: "admin-gate",
      wallet: input.wallet,
      email: flow.email,
      googleEmail: flow.googleEmail,
    },
    input.wallet,
  );

  return {
    ...session,
    actor: input.wallet,
    platformId: "admin-gate",
  };
}
