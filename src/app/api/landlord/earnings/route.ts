/**
 * GET /api/landlord/earnings
 * Returns payment/earnings summary for the authenticated landlord.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    if (session.user.role !== "LANDLORD" && session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Landlords only." }, { status: 403 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        property: { landlordId: session.user.id },
        status: { in: ["PAID"] },
        paymentStatus: "SUCCESS",
      },
      include: {
        student: { select: { name: true, email: true } },
        property: { select: { id: true, title: true, price: true } },
        payments: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { paidAt: "desc" },
    });

    const totalEarnings = bookings.reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const monthlyEarnings = bookings
      .filter((b) => b.paidAt && new Date(b.paidAt) >= thisMonth)
      .reduce((sum, b) => sum + Number(b.amount ?? 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalEarnings,
        monthlyEarnings,
        totalPaidBookings: bookings.length,
        bookings: bookings.map((b) => ({
          id: b.id,
          propertyTitle: b.property.title,
          studentName: b.student.name,
          amount: Number(b.amount ?? 0),
          paidAt: b.paidAt,
          paystackRef: b.payments[0]?.paystackRef ?? null,
          moveInDate: b.moveInDate,
          leaseEndDate: b.leaseEndDate,
        })),
      },
    });
  } catch (error) {
    console.error("[EARNINGS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch earnings." }, { status: 500 });
  }
}
