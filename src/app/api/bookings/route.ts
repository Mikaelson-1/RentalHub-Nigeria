/**
 * GET  /api/bookings   — List user's bookings
 * POST /api/bookings   — Create a booking (students only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import {
  sendBookingRequestToLandlord,
  sendBookingConfirmedToStudent,
  sendBookingCancelledToStudent,
  sendBookingCancelledToLandlord,
} from '@/lib/email';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const where =
      session.user.role === 'STUDENT'
        ? { studentId: session.user.id }
        : session.user.role === 'LANDLORD'
        ? { property: { landlordId: session.user.id } }
        : {}; // ADMIN sees all

    const bookings = await prisma.booking.findMany({
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
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error('[BOOKINGS GET ERROR]', error);
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

    // Prevent duplicate active bookings
    const existingBooking = await prisma.booking.findFirst({
      where: {
        studentId:  session.user.id,
        propertyId,
        status:     { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'You already have an active booking for this property.' },
        { status: 409 },
      );
    }

    const booking = await prisma.booking.create({
      data: {
        studentId:  session.user.id,
        propertyId,
        status:     'PENDING',
      },
      include: {
        student:  { select: { id: true, name: true, email: true } },
        property: {
          include: {
            location: true,
            landlord: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Notify the landlord about the new booking request (fire-and-forget)
    sendBookingRequestToLandlord({
      landlordEmail:    booking.property.landlord.email,
      landlordName:     booking.property.landlord.name,
      studentName:      booking.student.name,
      propertyTitle:    booking.property.title,
      propertyLocation: booking.property.location.name,
      bookingId:        booking.id,
    }).catch((err) => console.error('[email] booking request notification failed:', err));

    return NextResponse.json(
      { success: true, data: booking, message: 'Booking request submitted successfully.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('[BOOKINGS POST ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to create booking.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const { bookingId, status } = await request.json();

    if (!bookingId || !status) {
      return NextResponse.json({ success: false, error: "Booking ID and status are required." }, { status: 400 });
    }

    if (!["CONFIRMED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid booking status update." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: {
            landlordId: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    }

    if (session.user.role === "STUDENT") {
      if (booking.studentId !== session.user.id) {
        return NextResponse.json({ success: false, error: "You can only update your own bookings." }, { status: 403 });
      }
      if (status !== "CANCELLED") {
        return NextResponse.json({ success: false, error: "Students can only cancel bookings." }, { status: 403 });
      }
    }

    if (session.user.role === "LANDLORD") {
      if (booking.property.landlordId !== session.user.id) {
        return NextResponse.json({ success: false, error: "You can only update requests for your listings." }, { status: 403 });
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        student: { select: { id: true, name: true, email: true } },
        property: {
          include: {
            location: true,
            landlord: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Send email notifications based on the new status (fire-and-forget)
    const { student, property } = updatedBooking;
    const locationName = property.location.name;

    if (status === "CONFIRMED") {
      sendBookingConfirmedToStudent({
        studentEmail:     student.email,
        studentName:      student.name,
        propertyTitle:    property.title,
        propertyLocation: locationName,
        landlordName:     property.landlord.name,
      }).catch((err) => console.error('[email] booking confirmed notification failed:', err));
    }

    if (status === "CANCELLED") {
      const cancelledBy = session.user.role === "STUDENT" ? "student" : "landlord";

      // Always notify the student
      sendBookingCancelledToStudent({
        studentEmail:     student.email,
        studentName:      student.name,
        propertyTitle:    property.title,
        propertyLocation: locationName,
        cancelledBy,
      }).catch((err) => console.error('[email] booking cancelled (student) notification failed:', err));

      // If the student cancelled, also notify the landlord
      if (cancelledBy === "student") {
        sendBookingCancelledToLandlord({
          landlordEmail:    property.landlord.email,
          landlordName:     property.landlord.name,
          studentName:      student.name,
          propertyTitle:    property.title,
          propertyLocation: locationName,
        }).catch((err) => console.error('[email] booking cancelled (landlord) notification failed:', err));
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: `Booking ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.error("[BOOKINGS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update booking." }, { status: 500 });
  }
}
