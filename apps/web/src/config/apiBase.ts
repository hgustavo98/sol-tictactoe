import { normalizeApiUrl, normalizeAppUrl } from "./normalizeUrl";

/** Production host → API host when VITE_API_URL was missing at build time. */
/** Vercel production hosts → Render API (no custom domain required). */
const API_BY_APP_HOST: Record<string, string> = {
  "sol-tictactoe.vercel.app": "https://sol-ttt-api.onrender.com",
  "sol-ttt.vercel.app": "https://sol-ttt-api.onrender.com",
};

/**
 * API origin for fetch/socket. Empty in local dev → Vite proxies /api to localhost.
 * Must be a function: VITE_API_URL is inlined at build time and may be absent on Vercel.
 */
export function getApiBase(): string {
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
