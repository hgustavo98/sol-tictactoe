import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const walletChallenges = new Map<
  string,
  { message: string; wallet: string; expiresAt: number }
>();

export function createWalletChallenge(
  nonce: string,
  message: string,
  expiresAt: number,
  wallet?: string,
): { nonce: string; message: string; expiresAt: number } {
  walletChallenges.set(nonce, { message, wallet: wallet ?? "", expiresAt });
  return { nonce, message, expiresAt };
}

export function verifyWalletSignature(
  wallet: string,
  signature: string,
  nonce: string,
): { valid: boolean; error?: string } {
  const challenge = walletChallenges.get(nonce);
  if (!challenge || challenge.expiresAt < Date.now()) {
    return { valid: false, error: "Challenge expired or invalid" };
  }
  if (challenge.wallet && challenge.wallet !== wallet) {
    return { valid: false, error: "Wallet mismatch" };
  }
  walletChallenges.delete(nonce);

  try {
    const publicKey = new PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(challenge.message);
    const signatureBytes = bs58.decode(signature);
    const ok = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes(),
    );
    return ok ? { valid: true } : { valid: false, error: "Invalid signature" };
  } catch {
    return { valid: false, error: "Invalid signature" };
  }
}
