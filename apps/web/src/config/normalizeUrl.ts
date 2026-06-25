/** Accept bare host or full URL from Vercel env. */
export function normalizeAppUrl(
  raw: string | undefined,
  fallback: string,
): string {
  const v = (raw ?? fallback).trim();
  if (!v) return fallback;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(v)) {
    return `http://${v.replace(/^\/+/, "")}`;
  }
  return `https://${v.replace(/^\/+/, "")}`;
}

export function normalizeApiUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v.replace(/\/$/, "");
  return `https://${v.replace(/^\/+/, "").replace(/\/$/, "")}`;
}
