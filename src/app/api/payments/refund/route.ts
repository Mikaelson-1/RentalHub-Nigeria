/**
 * POST /api/payments/refund
 * Initiates a Paystack refund for a cancelled PAID booking.
 * Body: { bookingId }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });

    const { bookingId } = await request.json();
    if (!bookingId) return NextResponse.json({ success: false, error: "Booking ID required." }, { status: 400 });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, name: true } },
        property: { select: { id: true, title: true, landlordId: true } },
        payments: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    if (session.user.role === "STUDENT" && booking.studentId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Not your booking." }, { status: 403 });
    }
    if (session.user.role === "LANDLORD" && booking.property.landlordId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Not your listing." }, { status: 403 });
    }
    if (!["STUDENT", "LANDLORD", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Not authorized to refund this booking." }, { status: 403 });
    }
    if (booking.paymentStatus !== "SUCCESS") {
      return NextResponse.json({ success: false, error: "No successful payment to refund." }, { status: 400 });
    }

    const payment = booking.payments[0];
    if (!payment?.paystackRef) return NextResponse.json({ success: false, error: "No payment reference found." }, { status: 400 });

    const refundRes = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: payment.paystackRef }),
    });

    const refundData = await refundRes.json();
    if (!refundData.status) {
      return NextResponse.json({ success: false, error: refundData.message || "Refund failed." }, { status: 500 });
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", paymentStatus: "REFUNDED" },
    });

    // Restore vacant unit
    await prisma.property.update({
      where: { id: booking.propertyId },
      data: { vacantUnits: { increment: 1 } },
    });

    await Promise.all([
      notifyUser({
        userId: booking.student.id,
        type: "PAYMENT",
        title: "Refund initiated",
        message: `Refund for ${booking.property.title} has been initiated.`,
        link: "/student",
      }),
      notifyUser({
        userId: booking.property.landlordId,
        type: "PAYMENT",
        title: "Refund initiated",
        message: `A refund has been initiated for a cancelled booking on ${booking.property.title}.`,
        link: "/landlord",
      }),
    ]);

    return NextResponse.json({ success: true, message: "Refund initiated. It will reflect in 3-5 business days." });
  } catch (error) {
    console.error("[REFUND ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to process refund." }, { status: 500 });
  }
}
