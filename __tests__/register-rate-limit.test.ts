/**
 * Tests for fix #9: Rate limiting on registration endpoint
 */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));

// Mock rateLimit to simulate blocked and allowed states
const mockRateLimit = jest.fn();
jest.mock('@/lib/rate-limit', () => ({
  rateLimit:       mockRateLimit,
  getRateLimitKey: jest.fn(() => 'test-key'),
}));

import { POST } from '@/app/api/auth/register/route';
import prisma from '@/lib/prisma';

describe('Registration rate limiting (fix #9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 429 when rate limit is exceeded', async () => {
    mockRateLimit.mockReturnValue({ success: false, remaining: 0, retryAfter: 60 });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'password123', role: 'STUDENT' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toMatch(/too many/i);
  });

  it('returns Retry-After header when rate limited', async () => {
    mockRateLimit.mockReturnValue({ success: false, remaining: 0, retryAfter: 120 });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'password123', role: 'STUDENT' }),
    });

    const res = await POST(req);
    expect(res.headers.get('Retry-After')).toBe('120');
  });

  it('proceeds normally when within rate limit', async () => {
    mockRateLimit.mockReturnValue({ success: true, remaining: 4, retryAfter: 0 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: '1', name: 'Test', email: 'test@example.com', role: 'STUDENT', verificationStatus: 'VERIFIED', createdAt: new Date(),
    });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'password123', role: 'STUDENT' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});
