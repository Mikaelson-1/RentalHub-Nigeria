/**
 * lib/rate-limit.ts
 *
 * Simple in-memory sliding-window rate limiter.
 * Suitable for a single-instance Next.js server.
 * For multi-instance deployments, replace with Redis-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms timestamp
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in seconds. */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  /** Remaining requests allowed in this window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

/**
 * Check and increment the rate limit counter for a given key.
 * Returns whether the request is within the allowed limit.
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Start new window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: options.limit - 1, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > options.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, remaining: 0, retryAfter };
  }

  return {
    success:    true,
    remaining:  options.limit - entry.count,
    retryAfter: 0,
  };
}

/**
 * Build a rate limit key from a request (uses X-Forwarded-For or connection IP).
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  const forwarded = (request.headers as Headers).get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `${prefix}:${ip}`;
}
