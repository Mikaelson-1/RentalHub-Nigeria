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
import { notifyUser } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    if (session.user.role !== "STUDENT" && session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Only students or admins can verify payments." }, { status: 403 });
    }

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

    const metadataBookingId = verifyData?.data?.metadata?.bookingId as string | undefined;
    if (metadataBookingId && metadataBookingId !== bookingId) {
      return NextResponse.json({ success: false, error: "Payment reference does not match this booking." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          include: {
            location: { select: { name: true } },
            landlord: { select: { id: true, name: true, email: true, phoneNumber: true } },
          },
        },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    const paymentRecord = await prisma.payment.findFirst({
      where: {
        bookingId,
        paystackRef: reference,
      },
      select: { id: true },
    });
    if (!paymentRecord) {
      return NextResponse.json({ success: false, error: "Invalid payment reference for this booking." }, { status: 400 });
    }
    if (session.user.role === "STUDENT" && booking.studentId !== session.user.id) {
      return NextResponse.json({ success: false, error: "You are not allowed to verify this booking payment." }, { status: 403 });
    }

    const amountPaid = verifyData.data.amount / 100; // convert kobo back to naira

    // Idempotency guard: if this booking is already paid, return success without mutating stock/payment again.
    if (booking.status === "PAID" || booking.paymentStatus === "SUCCESS") {
      return NextResponse.json({
        success: true,
        data: {
          paymentStatus: "SUCCESS",
          amountPaid: Number(booking.amount ?? amountPaid),
          reference,
          alreadyVerified: true,
        },
      });
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const freshBooking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          amount: true,
          propertyId: true,
        },
      });

      if (!freshBooking) {
        return { alreadyVerified: false, amountPaid };
      }

      if (freshBooking.status === "PAID" || freshBooking.paymentStatus === "SUCCESS") {
        return { alreadyVerified: true, amountPaid: Number(freshBooking.amount ?? amountPaid) };
      }

      await tx.payment.updateMany({
        where: { paystackRef: reference },
        data: {
          status: "SUCCESS",
          paidAt: new Date(),
          channel: verifyData.data.channel,
          metadata: verifyData.data,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "PAID",
          paymentStatus: "SUCCESS",
          paidAt: new Date(),
          amount: amountPaid,
        },
      });

      await tx.property.update({
        where: { id: freshBooking.propertyId },
        data: { vacantUnits: { decrement: 1 } },
      });

      return { alreadyVerified: false, amountPaid };
    });

    if (txResult.alreadyVerified) {
      return NextResponse.json({
        success: true,
        data: { paymentStatus: "SUCCESS", amountPaid: txResult.amountPaid, reference, alreadyVerified: true },
      });
    }

    // Send confirmation emails (fire-and-forget)
    const formattedAmount = Number(txResult.amountPaid).toLocaleString("en-NG");
    const moveInStr = booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : undefined;

    sendPaymentConfirmedToStudent({
      studentEmail: booking.student.email,
      studentName: booking.student.name,
      propertyTitle: booking.property.title,
      propertyLocation: booking.property.location.name,
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

    await Promise.all([
      notifyUser({
        userId: booking.student.id,
        type: "PAYMENT",
        title: "Payment successful",
        message: `Your payment for ${booking.property.title} was confirmed.`,
        link: `/student/bookings/${bookingId}/receipt`,
      }),
      notifyUser({
        userId: booking.property.landlord.id,
        type: "PAYMENT",
        title: "Payment received",
        message: `${booking.student.name} completed payment for ${booking.property.title}.`,
        link: "/landlord",
      }),
    ]);

    return NextResponse.json({ success: true, data: { paymentStatus: "SUCCESS", amountPaid: txResult.amountPaid, reference } });
  } catch (error) {
    console.error("[PAYMENT VERIFY ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to verify payment." }, { status: 500 });
  }
}
