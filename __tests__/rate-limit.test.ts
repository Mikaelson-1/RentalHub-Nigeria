/**
 * Tests for fix #9: Rate limiting (src/lib/rate-limit.ts)
 */

import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests within limit', () => {
    const result = rateLimit('test-allow-1', { limit: 3, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests over the limit', () => {
    const key = 'test-block-' + Date.now();
    rateLimit(key, { limit: 2, windowSeconds: 60 });
    rateLimit(key, { limit: 2, windowSeconds: 60 });
    const blocked = rateLimit(key, { limit: 2, windowSeconds: 60 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('uses independent counters for different keys', () => {
    const key1 = 'ip-a-' + Date.now();
    const key2 = 'ip-b-' + Date.now();
    rateLimit(key1, { limit: 1, windowSeconds: 60 });
    rateLimit(key1, { limit: 1, windowSeconds: 60 }); // blocked
    const r2 = rateLimit(key2, { limit: 1, windowSeconds: 60 });
    expect(r2.success).toBe(true);
  });

  it('resets after the window expires', () => {
    jest.useFakeTimers();
    const key = 'reset-test-' + Date.now();
    rateLimit(key, { limit: 1, windowSeconds: 1 });
    rateLimit(key, { limit: 1, windowSeconds: 1 }); // blocked

    // Advance past the window
    jest.advanceTimersByTime(1001);

    const afterReset = rateLimit(key, { limit: 1, windowSeconds: 1 });
    expect(afterReset.success).toBe(true);
    jest.useRealTimers();
  });
});
