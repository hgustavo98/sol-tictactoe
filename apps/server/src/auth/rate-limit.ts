import type { Request, Response, NextFunction } from "express";
import { consumeRateLimit } from "../db";
import { clientIp } from "./client-ip";

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();

function memoryRateLimitHit(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, bucket);
  }

  bucket.count += 1;
  return bucket.count <= max;
}

/** HTTP rate limiter — MongoDB-backed when available, in-memory fallback. */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}) {
  const { windowMs, max, keyPrefix = "" } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${keyPrefix}${clientIp(req)}`;

    void (async () => {
      try {
        const allowed = await consumeRateLimit(key, windowMs, max);
        if (!allowed) {
          res.status(429).json({ error: "Too many requests — try again later" });
          return;
        }
        next();
      } catch {
        if (!memoryRateLimitHit(key, windowMs, max)) {
          res.status(429).json({ error: "Too many requests — try again later" });
          return;
        }
        next();
      }
    })();
  };
}
