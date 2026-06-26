import { randomUUID } from "crypto";
import { isGuestWallet } from "@sol-tictactoe/shared";
import { deletePlayerSession, getPlayerSession } from "../db";
import {
  createPlayerChallenge,
  verifyPlayerSignature,
} from "./player-auth-shared";
import { issuePlayerSession } from "./player-session";

export function createWalletSignInChallenge(wallet: string): {
  nonce: string;
  message: string;
  expiresAt: number;
} {
  if (isGuestWallet(wallet)) {
    throw new Error("Guests cannot sign in with a wallet");
  }

  const nonce = randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const message = [
    "Tactoe Sign-In",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
  ].join("\n");

  return createPlayerChallenge(nonce, message, expiresAt, wallet);
}

export async function verifyWalletSignIn(input: {
  wallet: string;
  signature: string;
  nonce: string;
}): Promise<{ token: string; expiresAt: number; wallet: string }> {
  const result = verifyPlayerSignature(
    input.wallet,
    input.signature,
    input.nonce,
  );
  if (!result.valid) {
    throw new Error(result.error ?? "Invalid wallet signature");
  }
  return issuePlayerSession(input.wallet);
}

export async function resolvePlayerSession(token: string) {
  return getPlayerSession(token);
}

export async function logoutPlayerSession(token: string): Promise<void> {
  await deletePlayerSession(token);
}
