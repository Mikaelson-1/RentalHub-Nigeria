/**
 * GET   /api/admin/landlords          — List landlords pending / under review
 * PATCH /api/admin/landlords          — Approve or reject a landlord's verification
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendVerificationRejectedToLandlord } from "@/lib/email";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const landlords = await prisma.user.findMany({
      where: {
        role: "LANDLORD",
        OR: [
          { verificationStatus: { in: ["UNVERIFIED", "UNDER_REVIEW", "REJECTED", "SUSPENDED"] } },
          // Also return VERIFIED landlords who have no documents (verified without proper review)
          { verificationStatus: "VERIFIED", governmentIdUrl: null },
        ],
      },
      select: {
        id:                      true,
        name:                    true,
        email:                   true,
        phoneNumber:             true,
        verificationStatus:      true,
        governmentIdUrl:         true,
        selfieUrl:               true,
        isDirectOwner:           true,
        landlordAware:           true,
        ownershipProofUrl:       true,
        verificationNote:        true,
        verificationSubmittedAt: true,
        aiPreScreenScore:        true,
        aiPreScreenNote:         true,
        createdAt:               true,
        _count: { select: { properties: true } },
      },
      orderBy: { verificationSubmittedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: landlords });
  } catch (error) {
    console.error("[ADMIN LANDLORDS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch landlords." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const landlordId: string = body.landlordId ?? body.userId;
    const action: string = body.action;
    const note: string | undefined = body.note;

    if (!landlordId || !["APPROVE", "REJECT", "SUSPEND", "UNSUSPEND", "RESET"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "landlordId (or userId) and action (APPROVE | REJECT | SUSPEND | UNSUSPEND | RESET) are required." },
        { status: 400 },
      );
    }

    if (action === "REJECT" && !note?.trim()) {
      return NextResponse.json(
        { success: false, error: "A rejection reason is required so the landlord knows what to fix." },
        { status: 400 },
      );
    }

    const statusMap: Record<string, string> = {
      APPROVE:   "VERIFIED",
      REJECT:    "REJECTED",
      SUSPEND:   "SUSPENDED",
      UNSUSPEND: "VERIFIED",
      RESET:     "UNVERIFIED",
    };

    const updated = await prisma.user.update({
      where: { id: landlordId },
      data:  {
        verificationStatus:      statusMap[action] as "VERIFIED" | "REJECTED" | "SUSPENDED" | "UNVERIFIED",
        verificationNote:        action === "REJECT" ? (note ?? "").trim() : null,
        // RESET clears all submitted documents so landlord must re-submit
        ...(action === "RESET" ? {
          governmentIdUrl:         null,
          selfieUrl:               null,
          ownershipProofUrl:       null,
          verificationSubmittedAt: null,
          aiPreScreenScore:        null,
          aiPreScreenNote:         null,
        } : {}),
      },
      select: { id: true, name: true, email: true, verificationStatus: true },
    });

    // Send rejection email (fire-and-forget)
    if (action === "REJECT" && note?.trim()) {
      sendVerificationRejectedToLandlord({
        landlordEmail: updated.email,
        landlordName: updated.name,
        rejectionNote: note.trim(),
      }).catch((err) => console.error("[email] verification rejected landlord notification failed:", err));
    }

    return NextResponse.json({
      success: true,
      data:    updated,
      message: action === "APPROVE" || action === "UNSUSPEND"
        ? `${updated.name} has been verified.`
        : action === "SUSPEND"
        ? `${updated.name} has been suspended.`
        : action === "RESET"
        ? `${updated.name}'s verification has been reset. They must re-submit documents.`
        : `${updated.name}'s verification was rejected.`,
    });
  } catch (error) {
    console.error("[ADMIN LANDLORDS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update landlord verification." }, { status: 500 });
  }
}
