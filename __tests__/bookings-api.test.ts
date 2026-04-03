/**
 * Tests for fix #1/#2: Booking confirmation workflow
 * Tests for fix #11/#12: Atomic booking creation
 *
 * These tests document the expected API behaviour.
 * Run with Jest after `npm install`.
 */

// Mock Prisma and NextAuth so tests are self-contained.
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    booking: {
      findFirst:  jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn() } }));

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const mockSession = (role: string, id = 'user-1') => ({
  user: { id, role, verificationStatus: 'VERIFIED' },
});

describe('PATCH /api/bookings/[id] — landlord confirmation (fix #1/#2)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/bookings/[id]/route');
    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects students from updating bookings', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('STUDENT'));
    const { PATCH } = await import('@/app/api/bookings/[id]/route');
    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects invalid status values', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('LANDLORD'));
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1', status: 'PENDING', property: { landlordId: 'user-1' },
    });
    const { PATCH } = await import('@/app/api/bookings/[id]/route');
    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PENDING' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(400);
  });

  it('prevents landlord updating booking for another landlord\'s property', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('LANDLORD', 'landlord-1'));
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1', status: 'PENDING', property: { landlordId: 'landlord-2' },
    });
    const { PATCH } = await import('@/app/api/bookings/[id]/route');
    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(403);
  });

  it('prevents updating a non-PENDING booking', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('LANDLORD', 'landlord-1'));
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1', status: 'CONFIRMED', property: { landlordId: 'landlord-1' },
    });
    const { PATCH } = await import('@/app/api/bookings/[id]/route');
    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/bookings — atomic duplicate prevention (fix #11/#12)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 409 when duplicate booking detected inside transaction', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession('STUDENT'));
    (prisma.property.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', status: 'APPROVED' });
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      Object.assign(new Error('You already have an active booking for this property.'), { code: 'DUPLICATE' }),
    );
    const { POST } = await import('@/app/api/bookings/route');
    const req = new Request('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ propertyId: 'p1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
