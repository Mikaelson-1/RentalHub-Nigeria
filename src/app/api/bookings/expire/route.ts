/**
 * POST /api/bookings/expire
 * Cancels all AWAITING_PAYMENT bookings whose expiresAt has passed.
 * Call this from a cron job or Vercel cron (add to vercel.json).
 * Protected by CRON_SECRET env var.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendBookingExpiredToStudent } from "@/lib/email";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expired = await prisma.booking.findMany({
      where: {
        status: "AWAITING_PAYMENT",
        expiresAt: { lt: new Date() },
      },
      include: {
        student: { select: { name: true, email: true } },
        property: { select: { title: true } },
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ success: true, expired: 0 });
    }

    await prisma.booking.updateMany({
      where: { id: { in: expired.map((b) => b.id) } },
      data: { status: "EXPIRED" },
    });

    for (const b of expired) {
      sendBookingExpiredToStudent({
        studentEmail: b.student.email,
        studentName: b.student.name,
        propertyTitle: b.property.title,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, expired: expired.length, ids: expired.map((b) => b.id) });
  } catch (error) {
    console.error("[EXPIRE ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to expire bookings." }, { status: 500 });
  }
}
