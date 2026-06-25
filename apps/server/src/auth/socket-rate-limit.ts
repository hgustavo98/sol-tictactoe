import { consumeRateLimit } from "../db";

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();

function memoryAllow(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, bucket);
  }

  bucket.count += 1;
  return bucket.count <= max;
}

/**
 * Per-socket event rate limit — Mongo-backed (multi-instance safe) with in-memory fallback.
 */
export async function allowSocketEvent(
  socketId: string,
  event: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const key = `socket:${socketId}:${event}`;
  try {
    return await consumeRateLimit(key, windowMs, max);
  } catch {
    return memoryAllow(key, windowMs, max);
  }
}

export function socketRateLimitError(event: string): string {
  return `Too many ${event} requests — slow down`;
}
