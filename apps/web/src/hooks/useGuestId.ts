import { useEffect, useState } from "react";
import type { GuestSessionInfo } from "@sol-tictactoe/shared";
import { getApiBase } from "../config/apiBase";
import { syncSocketAuth } from "./useSocket";

const GUEST_SESSION_KEY = "sol-ttt-guest-session";

export type GuestSessionFailureReason = "network" | "server";

export type GuestSessionResult =
  | { ok: true; session: GuestSessionInfo }
  | { ok: false; reason: GuestSessionFailureReason };

function loadStoredGuest(): GuestSessionInfo | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestSessionInfo;
    if (parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistGuestSession(session: GuestSessionInfo): GuestSessionInfo {
  sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  syncSocketAuth({ guestToken: session.token });
  return session;
}

export function getGuestSession(): GuestSessionInfo | null {
  return loadStoredGuest();
}

/** Returns a valid guest session, refreshing and syncing the socket when needed. */
export async function ensureGuestSession(): Promise<GuestSessionResult> {
  const stored = loadStoredGuest();
  if (stored) {
    syncSocketAuth({ guestToken: stored.token });
    return { ok: true, session: stored };
  }
  return refreshGuestSession();
}

export function refreshGuestSession(): Promise<GuestSessionResult> {
  const tryOnce = () =>
    fetch(`${getApiBase()}/api/auth/guest`, { method: "POST" }).then(
      async (res): Promise<GuestSessionResult> => {
        if (!res.ok) return { ok: false, reason: "server" };
        const session = (await res.json()) as GuestSessionInfo;
        return { ok: true, session: persistGuestSession(session) };
      },
    );

  const wakeAndRetry = async (): Promise<GuestSessionResult> => {
    try {
      await fetch(`${getApiBase()}/health`);
    } catch {
      /* cold start — still try guest */
    }
    return tryOnce();
  };

  return tryOnce()
    .catch((): Promise<GuestSessionResult> => wakeAndRetry())
    .catch((): GuestSessionResult => ({ ok: false, reason: "network" }));
}

export function useGuestId(): string | null {
  const [guestId, setGuestId] = useState<string | null>(
    () => loadStoredGuest()?.guestId ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    const stored = loadStoredGuest();
    if (stored) {
      setGuestId(stored.guestId);
      syncSocketAuth({ guestToken: stored.token });
      return;
    }

    void refreshGuestSession().then((result) => {
      if (cancelled || !result.ok) return;
      setGuestId(result.session.guestId);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return guestId;
}

export function isGuestId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith("guest_"));
}
