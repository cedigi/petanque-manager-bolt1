interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

interface RateState {
  count: number;
  expiresAt: number;
}

const buckets = new Map<string, RateState>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function consumeToken(identifier: string, options: RateLimiterOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(identifier);
  if (!existing || existing.expiresAt <= now) {
    buckets.set(identifier, { count: 1, expiresAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1 };
  }

  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.expiresAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(options.limit - existing.count, 0) };
}

export function clearRateLimiter() {
  buckets.clear();
}
