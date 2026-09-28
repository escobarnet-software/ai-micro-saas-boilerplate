interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Best-effort in-memory sliding window limiter.
 *
 * It protects a single server instance, which is enough for local development
 * and small deployments. Swap the Map for Redis / Upstash when you scale to
 * multiple instances.
 */
export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: Math.max(limit - 1, 0), resetAt };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    success: true,
    remaining: Math.max(limit - bucket.count, 0),
    resetAt: bucket.resetAt,
  };
}

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
