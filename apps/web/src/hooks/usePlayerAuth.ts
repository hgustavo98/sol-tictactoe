import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import type { PlayerSessionInfo } from "@sol-tictactoe/shared";
import { getApiBase } from "../config/apiBase";
import {
  clearPlayerSession,
  loadPlayerSession,
  savePlayerSession,
} from "./playerAuthStorage";
import { syncSocketAuth } from "./useSocket";
import { getGuestSession } from "./useGuestId";

async function signInWithWallet(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<PlayerSessionInfo> {
  const api = getApiBase();
  const challengeRes = await fetch(`${api}/api/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: walletAddress }),
  });
  if (!challengeRes.ok) {
    const body = (await challengeRes.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to get sign-in challenge");
  }
  const challenge = (await challengeRes.json()) as {
    nonce: string;
    message: string;
    expiresAt: number;
  };

  const signed = await signMessage(new TextEncoder().encode(challenge.message));
  const signature = bs58.encode(signed);

  const verifyRes = await fetch(`${api}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: walletAddress,
      signature,
      nonce: challenge.nonce,
    }),
  });
  if (!verifyRes.ok) {
    const body = (await verifyRes.json()) as { error?: string };
    throw new Error(body.error ?? "Wallet sign-in failed");
  }

  const session = (await verifyRes.json()) as PlayerSessionInfo;
  savePlayerSession(session);
  return session;
}

export function usePlayerAuth(guestId: string | null) {
  const wallet = useWallet();
  const walletAddress = wallet.publicKey?.toBase58() ?? null;
  const [session, setSession] = useState<PlayerSessionInfo | null>(() =>
    loadPlayerSession(),
  );
  const [signingIn, setSigningIn] = useState(false);
  const signInFlight = useRef<Promise<string | null> | null>(null);
  const autoSignAttemptedRef = useRef<string | null>(null);

  const applySession = useCallback((next: PlayerSessionInfo | null) => {
    setSession(next);
    const guestSession = getGuestSession();
    syncSocketAuth({
      token: next?.token,
      guestToken: next ? undefined : guestSession?.token,
      guestId:
        next || guestSession?.token ? undefined : (guestId ?? undefined),
    });
  }, [guestId]);

  const ensureSignedIn = useCallback(async (): Promise<string | null> => {
    if (!walletAddress || !wallet.connected) return null;

    const stored = loadPlayerSession();
    if (stored?.wallet === walletAddress && stored.expiresAt > Date.now()) {
      if (session?.token !== stored.token) {
        applySession(stored);
      }
      return walletAddress;
    }

    if (signInFlight.current) {
      return signInFlight.current;
    }

    const signMessage =
      wallet.signMessage ??
      (wallet.wallet?.adapter && "signMessage" in wallet.wallet.adapter
        ? wallet.wallet.adapter.signMessage?.bind(wallet.wallet.adapter)
        : undefined);

    if (!signMessage) {
      return null;
    }

    const flight = (async () => {
      setSigningIn(true);
      try {
        const next = await signInWithWallet(walletAddress, signMessage);
        applySession(next);
        return walletAddress;
      } catch {
        clearPlayerSession();
        applySession(null);
        return null;
      } finally {
        setSigningIn(false);
        signInFlight.current = null;
      }
    })();

    signInFlight.current = flight;
    return flight;
  }, [applySession, session?.token, wallet, walletAddress]);

  useEffect(() => {
    if (!walletAddress || !wallet.connected) {
      autoSignAttemptedRef.current = null;
      if (!wallet.connected) {
        applySession(null);
      }
      return;
    }

    const stored = loadPlayerSession();
    if (stored?.wallet === walletAddress && stored.expiresAt > Date.now()) {
      applySession(stored);
      return;
    }

    if (stored && stored.wallet !== walletAddress) {
      clearPlayerSession();
      applySession(null);
    }

    if (autoSignAttemptedRef.current === walletAddress) return;
    autoSignAttemptedRef.current = walletAddress;
    void ensureSignedIn();
  }, [walletAddress, wallet.connected, applySession, ensureSignedIn]);

  useEffect(() => {
    const hasWalletSession =
      Boolean(session?.wallet === walletAddress && session.expiresAt > Date.now());
    const guestSession = getGuestSession();
    syncSocketAuth({
      token: hasWalletSession ? session?.token : undefined,
      guestToken: hasWalletSession ? undefined : guestSession?.token,
      guestId:
        hasWalletSession || guestSession?.token
          ? undefined
          : (guestId ?? undefined),
    });
  }, [session, walletAddress, guestId]);

  return {
    session,
    signingIn,
    ensureSignedIn,
    isAuthenticated: Boolean(
      session &&
        session.expiresAt > Date.now() &&
        (!walletAddress || session.wallet === walletAddress),
    ),
  };
}

export function getPlayerAuthHeaders(): Record<string, string> {
  const token = loadPlayerSession()?.token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
