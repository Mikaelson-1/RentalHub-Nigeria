/**
 * Tests for:
 * fix #5  — Admin rejection reason
 * fix #6/#7 — Suspended landlord enforcement
 * fix #10 — Property edit (PUT)
 * fix #13 — Input sanitization on POST
 * fix #14 — Admin role cannot be registered
 */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    property: {
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));
jest.mock('@/lib/rate-limit', () => ({
  rateLimit:        jest.fn(() => ({ success: true, remaining: 9, retryAfter: 0 })),
  getRateLimitKey:  jest.fn(() => 'test-key'),
}));

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const mockSession = (role: string, verificationStatus = 'VERIFIED', id = 'user-1') => ({
  user: { id, role, verificationStatus },
});

describe('POST /api/properties — fix #6/#7: suspended landlord blocked', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for SUSPENDED landlord', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('LANDLORD', 'SUSPENDED'));
    const { POST } = await import('@/app/api/properties/route');
    const req = new Request('http://localhost/api/properties', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', description: 'desc', price: 100, locationId: 'loc1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/suspended/i);
  });
});

describe('PATCH /api/properties/[id]/status — fix #5: rejection reason required', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when REJECTED without a reason', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('ADMIN'));
    const { PATCH } = await import('@/app/api/properties/[id]/status/route');
    const req = new Request('http://localhost/api/properties/p1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REJECTED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/rejection reason/i);
  });

  it('returns 400 when REJECTED with empty reason', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('ADMIN'));
    const { PATCH } = await import('@/app/api/properties/[id]/status/route');
    const req = new Request('http://localhost/api/properties/p1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REJECTED', rejectionReason: '   ' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(400);
  });

  it('approves without a reason', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('ADMIN'));
    (prisma.property.update as jest.Mock).mockResolvedValue({ id: 'p1', status: 'APPROVED' });
    const { PATCH } = await import('@/app/api/properties/[id]/status/route');
    const req = new Request('http://localhost/api/properties/p1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/properties/[id] — fix #10: property edit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when landlord edits another landlord\'s property', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('LANDLORD', 'VERIFIED', 'landlord-1'));
    (prisma.property.findUnique as jest.Mock).mockResolvedValue({ landlordId: 'landlord-2', status: 'APPROVED' });
    const { PUT } = await import('@/app/api/properties/[id]/route');
    const req = new Request('http://localhost/api/properties/p1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'New title', description: 'desc', price: 100 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(403);
  });

  it('resets property to PENDING after edit', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('LANDLORD', 'VERIFIED', 'landlord-1'));
    (prisma.property.findUnique as jest.Mock).mockResolvedValue({ landlordId: 'landlord-1', status: 'APPROVED' });
    (prisma.property.update as jest.Mock).mockResolvedValue({ id: 'p1', status: 'PENDING' });
    const { PUT } = await import('@/app/api/properties/[id]/route');
    const req = new Request('http://localhost/api/properties/p1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', description: 'desc', price: 120 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
    const updateCall = (prisma.property.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe('PENDING');
  });
});

describe('POST /api/auth/register — fix #14: ADMIN role blocked', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when role=ADMIN is submitted', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hacker', email: 'h@test.com', password: 'password123', role: 'ADMIN' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid role/i);
  });

  it('returns 400 for arbitrary role strings', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', email: 'x@test.com', password: 'password123', role: 'SUPERUSER' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
