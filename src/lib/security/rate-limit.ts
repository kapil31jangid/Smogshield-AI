// shortcut: in-memory sliding-window rate limiter per serverless instance, upgrade to Redis/Upstash if multi-region cluster exceeds 50k rpm.

interface RateBucket {
  count: number;
  resetAtMs: number;
}

const buckets = new Map<string, RateBucket>();

export function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  if (buckets.size > 2000) {
    for (const [k, v] of buckets.entries()) {
      if (v.resetAtMs <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAtMs <= now) {
    buckets.set(key, { count: 1, resetAtMs: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAtMs - now) / 1000)
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    retryAfterSeconds: 0,
  };
}
