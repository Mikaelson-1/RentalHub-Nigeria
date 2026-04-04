/**
 * POST /api/payments/initiate
 * Initiates a Paystack payment for a confirmed booking.
 * Body: { bookingId }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    if (session.user.role !== "STUDENT") return NextResponse.json({ success: false, error: "Only students can initiate payments." }, { status: 403 });

    const { bookingId, moveInDate, leaseEndDate } = await request.json();
    if (!bookingId) return NextResponse.json({ success: false, error: "Booking ID required." }, { status: 400 });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { include: { landlord: { select: { id: true, name: true, phoneNumber: true } } } },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    if (booking.studentId !== session.user.id) return NextResponse.json({ success: false, error: "Not your booking." }, { status: 403 });
    if (booking.status !== "AWAITING_PAYMENT") return NextResponse.json({ success: false, error: "Booking is not awaiting payment." }, { status: 400 });

    const totalAmount = Number(booking.amount ?? booking.property.price) +
      Number(booking.agencyFee ?? 0) +
      Number(booking.cautionFee ?? 0);

    const amountKobo = Math.round(totalAmount * 100); // Paystack uses kobo
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/student/bookings/${bookingId}/verify-payment`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: booking.student.email,
        amount: amountKobo,
        reference: `RH-${bookingId}-${Date.now()}`,
        callback_url: callbackUrl,
        metadata: {
          bookingId,
          studentName: booking.student.name,
          propertyTitle: booking.property.title,
          custom_fields: [
            { display_name: "Property", variable_name: "property", value: booking.property.title },
            { display_name: "Booking ID", variable_name: "booking_id", value: bookingId },
          ],
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return NextResponse.json({ success: false, error: paystackData.message || "Payment initiation failed." }, { status: 500 });
    }

    // Save move-in/lease dates if provided
    if (moveInDate || leaseEndDate) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          ...(moveInDate && { moveInDate: new Date(moveInDate) }),
          ...(leaseEndDate && { leaseEndDate: new Date(leaseEndDate) }),
        },
      });
    }

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        bookingId,
        amount: totalAmount,
        status: "PENDING",
        paystackRef: paystackData.data.reference,
      },
    });

    return NextResponse.json({ success: true, data: { authorizationUrl: paystackData.data.authorization_url, reference: paystackData.data.reference } });
  } catch (error) {
    console.error("[PAYMENT INITIATE ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to initiate payment." }, { status: 500 });
  }
}
