/**
 * PATCH /api/bookings/[id]
 *
 * Landlord-only: confirm or cancel a booking for their property.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import type { BookingStatus } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Only landlords can update booking status.' }, { status: 403 });
    }

    const body = await request.json();
    const { status }: { status: BookingStatus } = body;

    if (!['CONFIRMED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be CONFIRMED or CANCELLED.' },
        { status: 400 },
      );
    }

    // Fetch the booking and verify the landlord owns the property
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { property: { select: { landlordId: true, title: true } } },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    // Landlords can only update bookings for their own properties
    if (session.user.role === 'LANDLORD' && booking.property.landlordId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'You can only manage bookings for your own properties.' }, { status: 403 });
    }

    // Can only update bookings that are still PENDING
    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot update a booking that is already ${booking.status}.` },
        { status: 409 },
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data:  { status },
      include: {
        student:  { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data:    updated,
      message: `Booking ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.error('[BOOKING PATCH ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to update booking.' }, { status: 500 });
  }
}
