import type { PlayerSessionInfo } from "@sol-tictactoe/shared";

const STORAGE_KEY = "sol-ttt-player-session";

function parseSession(raw: string): PlayerSessionInfo | null {
  const parsed = JSON.parse(raw) as PlayerSessionInfo;
  if (!parsed.token || !parsed.wallet || !parsed.expiresAt) return null;
  if (parsed.expiresAt <= Date.now()) return null;
  return parsed;
}

function migrateLegacySession(): PlayerSessionInfo | null {
  if (typeof sessionStorage === "undefined" || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = parseSession(raw);
    if (parsed) {
      localStorage.setItem(STORAGE_KEY, raw);
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadPlayerSession(): PlayerSessionInfo | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return migrateLegacySession();
    }
    const parsed = parseSession(raw);
    if (!parsed) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePlayerSession(session: PlayerSessionInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearPlayerSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore legacy cleanup failures
  }
}

export function getPlayerSessionToken(): string | null {
  return loadPlayerSession()?.token ?? null;
}
