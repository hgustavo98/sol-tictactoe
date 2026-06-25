/**
 * Vercel env vars are sometimes set as "sol-ttt.xyz" without a scheme.
 * Browsers treat that as a relative URL and break API / admin links.
 */
export function ensureHttpsUrl(raw, { allowHttpLocalhost = true } = {}) {
  const v = String(raw ?? "").trim();
  if (!v) return v;

  if (/^https?:\/\//i.test(v)) {
    return v.replace(/\/$/, "");
  }

  if (
    allowHttpLocalhost &&
    /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(v)
  ) {
    return `http://${v.replace(/^\/+/, "").replace(/\/$/, "")}`;
  }

  return `https://${v.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

export function normalizeViteEnv(env) {
  const out = { ...env };
  for (const key of [
    "VITE_API_URL",
    "VITE_PUBLIC_APP_URL",
    "VITE_PUBLIC_ADMIN_URL",
    "VITE_MAINNET_RPC_URL",
  ]) {
    if (out[key]) {
      const normalized = ensureHttpsUrl(out[key]);
      if (normalized !== out[key]) {
        console.log(`[build] Normalized ${key}: ${out[key]} → ${normalized}`);
      }
      out[key] = normalized;
    }
  }
  return out;
}
