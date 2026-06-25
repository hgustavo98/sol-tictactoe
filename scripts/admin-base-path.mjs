/** Default secret admin path on the Vercel app — set VITE_ADMIN_BASE_PATH in Vercel to rotate. */
export const DEFAULT_ADMIN_BASE_PATH = "/r8n4x2k7m9p3/";

export function normalizeAdminBase(raw) {
  let base = (raw ?? DEFAULT_ADMIN_BASE_PATH).trim();
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  if (base === "//") throw new Error("Invalid VITE_ADMIN_BASE_PATH");
  return base;
}

export function adminPathSegment(base) {
  return base.replace(/^\/|\/$/g, "");
}
