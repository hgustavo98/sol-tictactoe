import type { Request } from "express";
import { config } from "../config";

/**
 * Best-effort client IP behind Render / Cloudflare / reverse proxies.
 * Only trusts forwarding headers when `config.trustProxy` is enabled.
 */
export function clientIp(req: Request): string {
  if (!config.trustProxy) {
    return req.socket.remoteAddress ?? "unknown";
  }

  const cf = req.header("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const realIp = req.header("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}
