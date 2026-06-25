import { normalizeAppUrl } from "./normalizeUrl";

/** Public URL of the player-facing app (not admin). */
export const PUBLIC_APP_URL = normalizeAppUrl(
  import.meta.env.VITE_PUBLIC_APP_URL,
  "http://localhost:5173",
);

/** Dev-only: standalone admin app URL. Production admin uses a secret path on PUBLIC_APP_URL. */
export const PUBLIC_ADMIN_URL = normalizeAppUrl(
  import.meta.env.VITE_PUBLIC_ADMIN_URL,
  "http://localhost:5174",
);

/** Secret admin path segment on the same domain (production). Set in Vercel env. */
export function adminConsoleUrl(): string {
  const base = import.meta.env.VITE_ADMIN_BASE_PATH as string | undefined;
  if (base && PUBLIC_APP_URL) {
    const path = base.startsWith("/") ? base : `/${base}`;
    return `${PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;
  }
  return PUBLIC_ADMIN_URL;
}
