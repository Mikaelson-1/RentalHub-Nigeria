/**
 * GET /api/payments/verify?reference=xxx&bookingId=xxx
 * Verifies a Paystack payment after redirect from Paystack checkout.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  sendPaymentConfirmedToStudent,
  sendPaymentReceivedToLandlord,
} from "@/lib/email";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    const bookingId = searchParams.get("bookingId");

    if (!reference || !bookingId) return NextResponse.json({ success: false, error: "Reference and bookingId required." }, { status: 400 });

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data.status !== "success") {
      await prisma.payment.updateMany({ where: { paystackRef: reference }, data: { status: "FAILED" } });
      return NextResponse.json({ success: false, error: "Payment was not successful.", data: { paymentStatus: "FAILED" } }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          include: { landlord: { select: { id: true, name: true, email: true, phoneNumber: true } } },
        },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });

    const amountPaid = verifyData.data.amount / 100; // convert kobo back to naira

    // Update payment record
    await prisma.payment.updateMany({
      where: { paystackRef: reference },
      data: {
        status: "SUCCESS",
        paidAt: new Date(),
        channel: verifyData.data.channel,
        metadata: verifyData.data,
      },
    });

    // Update booking to PAID
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        paymentStatus: "SUCCESS",
        paidAt: new Date(),
        amount: amountPaid,
      },
    });

    // Decrement vacant units
    await prisma.property.update({
      where: { id: booking.propertyId },
      data: { vacantUnits: { decrement: 1 } },
    });

    // Send confirmation emails (fire-and-forget)
    const formattedAmount = Number(amountPaid).toLocaleString("en-NG");
    const moveInStr = booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : undefined;

    sendPaymentConfirmedToStudent({
      studentEmail: booking.student.email,
      studentName: booking.student.name,
      propertyTitle: booking.property.title,
      propertyLocation: "",
      landlordName: booking.property.landlord.name,
      landlordPhone: booking.property.landlord.phoneNumber ?? "",
      amount: formattedAmount,
      paystackRef: reference,
      moveInDate: moveInStr,
      bookingId,
    }).catch(console.error);

    sendPaymentReceivedToLandlord({
      landlordEmail: booking.property.landlord.email,
      landlordName: booking.property.landlord.name,
      studentName: booking.student.name,
      propertyTitle: booking.property.title,
      amount: formattedAmount,
      paystackRef: reference,
    }).catch(console.error);

    return NextResponse.json({ success: true, data: { paymentStatus: "SUCCESS", amountPaid, reference } });
  } catch (error) {
    console.error("[PAYMENT VERIFY ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to verify payment." }, { status: 500 });
  }
}
