/**
 * GET  /api/bookings   — List user's bookings
 * POST /api/bookings   — Create a booking (students only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '20')));

    const where =
      session.user.role === 'STUDENT'
        ? { studentId: session.user.id }
        : session.user.role === 'LANDLORD'
        ? { property: { landlordId: session.user.id } }
        : {}; // ADMIN sees all

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true } },
          property: {
            include: {
              location: true,
              landlord: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items:      bookings,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error('[BOOKINGS GET ERROR]', { error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Only students can make bookings.' }, { status: 403 });
    }

    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ success: false, error: 'Property ID is required.' }, { status: 400 });
    }

    // Verify property exists and is approved
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
    }
    if (property.status !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'This property is not available for booking.' }, { status: 400 });
    }

    // Atomically check for duplicates and create — prevents race conditions
    const booking = await prisma.$transaction(async (tx) => {
      const existingBooking = await tx.booking.findFirst({
        where: {
          studentId:  session.user.id,
          propertyId,
          status:     { in: ['PENDING', 'CONFIRMED'] },
        },
      });
      if (existingBooking) {
        throw Object.assign(new Error('You already have an active booking for this property.'), { code: 'DUPLICATE' });
      }

      return tx.booking.create({
        data: {
          studentId:  session.user.id,
          propertyId,
          status:     'PENDING',
        },
        include: {
          property: { include: { location: true } },
        },
      });
    });

    return NextResponse.json(
      { success: true, data: booking, message: 'Booking request submitted successfully.' },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'DUPLICATE') {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    logger.error('[BOOKINGS POST ERROR]', { error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to create booking.' }, { status: 500 });
  }
}
