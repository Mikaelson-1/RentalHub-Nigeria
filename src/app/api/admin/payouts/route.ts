/**
 * Admin Payouts API
 * GET  /api/admin/payouts — list bookings awaiting manual payout
 * PATCH /api/admin/payouts — mark a payout COMPLETED or FAILED
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import {
  sendPayoutReleasedToLandlord,
  sendPayoutReleasedToStudent,
  sendPayoutFailedToLandlord,
  sendPayoutFailedToStudent,
} from "@/lib/email";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    // V12 fix: exclude landlords whose bank details changed in the last 24h.
    // The 24h cool-off lets the landlord respond to the change-notification
    // email if the change wasn't them.
    const quarantineCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const payouts = await prisma.booking.findMany({
      where: {
        movedInConfirmedAt: { not: null },
        payoutStatus: { in: ["PENDING", "PROCESSING"] },
        status: "PAID",
        property: {
          landlord: {
            OR: [
              { bankChangeAt: null },
              { bankChangeAt: { lt: quarantineCutoff } },
            ],
          },
        },
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            location: { select: { name: true } },
            landlord: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                bankAccountNumber: true,
                bankName: true,
                bankAccountName: true,
              },
            },
          },
        },
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { amount: true, paidAt: true },
        },
      },
      orderBy: { movedInConfirmedAt: "asc" }, // oldest first
    });

    return NextResponse.json({ success: true, data: payouts });
  } catch (error) {
    console.error("[ADMIN PAYOUTS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch payouts." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const { bookingId, action } = await request.json();
    if (!bookingId || !["COMPLETE", "FAIL"].includes(action)) {
      return NextResponse.json({ success: false, error: "bookingId and action (COMPLETE|FAIL) required." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        amount: true,
        movedInConfirmedAt: true,
        payoutStatus: true,
        student: { select: { id: true, name: true, email: true } },
        property: {
          select: {
            title: true,
            price: true,
            landlord: {
              select: {
                id: true,
                name: true,
                email: true,
                bankName: true,
                bankAccountName: true,
                bankChangeAt: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    }
    if (!booking.movedInConfirmedAt) {
      return NextResponse.json({ success: false, error: "Student has not confirmed move-in yet." }, { status: 409 });
    }

    // V13 fix: block invalid state transitions.
    // Allowed: PENDING/PROCESSING → COMPLETED or FAILED.
    // Blocked: COMPLETED → anything (terminal), FAILED → COMPLETED (masks missing transfer).
    // If a genuinely FAILED payout needs to be retried, admin must re-initiate
    // the Paystack transfer (future endpoint), which resets state to PROCESSING.
    if (booking.payoutStatus === "COMPLETED") {
      return NextResponse.json({ success: false, error: "Payout is already COMPLETED and cannot be changed." }, { status: 409 });
    }
    if (booking.payoutStatus === "FAILED" && action === "COMPLETE") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot flip a FAILED payout to COMPLETED without re-initiating the transfer. Contact engineering.",
        },
        { status: 409 },
      );
    }

    // V12 fix: block COMPLETE during the 24h bank-change quarantine. Admin can
    // still mark FAILED (e.g. to cancel a queued payout they no longer trust).
    if (action === "COMPLETE" && booking.property.landlord.bankChangeAt) {
      const msSinceChange = Date.now() - new Date(booking.property.landlord.bankChangeAt).getTime();
      if (msSinceChange < 24 * 60 * 60 * 1000) {
        const hoursRemaining = Math.ceil((24 * 60 * 60 * 1000 - msSinceChange) / (60 * 60 * 1000));
        return NextResponse.json(
          {
            success: false,
            error: `Landlord recently changed their bank account. Payout quarantine ends in ~${hoursRemaining}h.`,
          },
          { status: 409 },
        );
      }
    }

    const newStatus = action === "COMPLETE" ? "COMPLETED" : "FAILED";
    console.log("[AUDIT][payouts]", {
      at: new Date().toISOString(),
      adminId: session.user.id,
      adminEmail: session.user.email,
      bookingId,
      prevStatus: booking.payoutStatus,
      newStatus,
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { payoutStatus: newStatus },
    });

    const landlord = booking.property.landlord;
    const amountNaira = Number(booking.amount ?? booking.property.price);
    const amountStr = amountNaira.toLocaleString("en-NG");

    // Notify landlord (in-app)
    notifyUser({
      userId: landlord.id,
      type: "PAYMENT",
      title: action === "COMPLETE" ? "Rent payment received" : "Payout issue",
      message:
        action === "COMPLETE"
          ? `Your rent payment for ${booking.property.title} has been transferred to your bank account.`
          : `There was an issue releasing your payment for ${booking.property.title}. Please contact RentalHub support.`,
      link: "/landlord",
    }).catch(console.error);

    // Notify student (in-app)
    notifyUser({
      userId: booking.student.id,
      type: "PAYMENT",
      title: action === "COMPLETE" ? "Payment released to landlord" : "Payout issue",
      message:
        action === "COMPLETE"
          ? `Your landlord has been paid for ${booking.property.title}.`
          : `There was an issue releasing the payment for ${booking.property.title}. RentalHub support will reach out.`,
      link: "/student",
    }).catch(console.error);

    // Send emails
    if (action === "COMPLETE") {
      sendPayoutReleasedToLandlord({
        landlordEmail: landlord.email,
        landlordName: landlord.name,
        studentName: booking.student.name,
        propertyTitle: booking.property.title,
        amount: amountStr,
        bankName: landlord.bankName ?? "your registered bank",
        accountName: landlord.bankAccountName ?? landlord.name,
      }).catch(console.error);

      sendPayoutReleasedToStudent({
        studentEmail: booking.student.email,
        studentName: booking.student.name,
        propertyTitle: booking.property.title,
        landlordName: landlord.name,
        amount: amountStr,
      }).catch(console.error);
    } else {
      sendPayoutFailedToLandlord({
        landlordEmail: landlord.email,
        landlordName: landlord.name,
        propertyTitle: booking.property.title,
        amount: amountStr,
      }).catch(console.error);

      sendPayoutFailedToStudent({
        studentEmail: booking.student.email,
        studentName: booking.student.name,
        propertyTitle: booking.property.title,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: action === "COMPLETE" ? "Payout marked as completed." : "Payout marked as failed.",
    });
  } catch (error) {
    console.error("[ADMIN PAYOUTS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update payout." }, { status: 500 });
  }
}
