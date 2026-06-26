import { normalizeApiUrl, normalizeAppUrl } from "./normalizeUrl";

/** Production host → API host when VITE_API_URL was missing at build time. */
/** Vercel production hosts → Render API (no custom domain required). */
const API_BY_APP_HOST: Record<string, string> = {
  "soltactoe.xyz": "https://sol-ttt-api.onrender.com",
  "www.soltactoe.xyz": "https://sol-ttt-api.onrender.com",
  "sol-tictactoe.vercel.app": "https://sol-ttt-api.onrender.com",
  "sol-ttt.vercel.app": "https://sol-ttt-api.onrender.com",
};

function resolveDirectApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return normalizeApiUrl(fromEnv);

  if (typeof window !== "undefined") {
    const mapped = API_BY_APP_HOST[window.location.hostname];
    if (mapped) return mapped;
  }

  const appUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const mapped =
        API_BY_APP_HOST[new URL(normalizeAppUrl(appUrl, appUrl)).hostname];
      if (mapped) return mapped;
    } catch {
      /* ignore */
    }
  }

  return "";
}

function isHostedAppOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(API_BY_APP_HOST[window.location.hostname]);
}

/**
 * REST API origin. Empty → same-origin /api (Vite or Vercel proxy).
 * Avoids cross-origin fetch + CORS on production web hosts.
 */
export function getApiBase(): string {
  if (import.meta.env.VITE_API_URL?.trim()) return resolveDirectApiUrl();
  if (isHostedAppOrigin()) return "";
  return resolveDirectApiUrl();
}

/** Direct API origin for Socket.IO (WebSocket cannot use the /api rewrite). */
export function getSocketBase(): string {
  return resolveDirectApiUrl();
}
