/**
 * POST /api/payments/webhook
 * Handles Paystack webhook events.
 * Add this URL in Paystack Dashboard → Settings → Webhooks
 */
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { sendPaymentConfirmedToStudent, sendPaymentReceivedToLandlord } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const secret = process.env.PAYSTACK_SECRET_KEY ?? "";

    // Verify webhook signature
    const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      console.error("[WEBHOOK] Invalid Paystack signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    console.log("[WEBHOOK] Event:", event.event);

    if (event.event === "charge.success") {
      const { reference, amount, channel, metadata } = event.data;
      const bookingId = metadata?.bookingId;
      if (!bookingId) return NextResponse.json({ received: true });

      const amountNaira = amount / 100;

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

      if (!booking || booking.status === "PAID") return NextResponse.json({ received: true });

      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { paystackRef: reference },
          data: { status: "SUCCESS", paidAt: new Date(), channel, metadata: event.data },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data: { status: "PAID", paymentStatus: "SUCCESS", paidAt: new Date(), amount: amountNaira },
        }),
        prisma.property.update({
          where: { id: booking.propertyId },
          data: { vacantUnits: { decrement: 1 } },
        }),
      ]);

      const formatted = Number(amountNaira).toLocaleString("en-NG");
      sendPaymentConfirmedToStudent({
        studentEmail: booking.student.email,
        studentName: booking.student.name,
        propertyTitle: booking.property.title,
        propertyLocation: booking.property.location.name,
        landlordName: booking.property.landlord.name,
        landlordPhone: booking.property.landlord.phoneNumber ?? "",
        amount: formatted,
        paystackRef: reference,
        bookingId,
      }).catch(console.error);

      sendPaymentReceivedToLandlord({
        landlordEmail: booking.property.landlord.email,
        landlordName: booking.property.landlord.name,
        studentName: booking.student.name,
        propertyTitle: booking.property.title,
        amount: formatted,
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
    }

    if (event.event === "refund.processed") {
      const { transaction_reference, amount } = event.data;
      await prisma.payment.updateMany({
        where: { paystackRef: transaction_reference },
        data: { status: "REFUNDED", refundedAt: new Date(), refundAmount: amount / 100 },
      });
      await prisma.booking.updateMany({
        where: { payments: { some: { paystackRef: transaction_reference } } },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
