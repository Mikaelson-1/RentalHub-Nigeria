/**
 * GET   /api/admin/landlords          — List landlords pending / under review
 * PATCH /api/admin/landlords          — Approve or reject a landlord's verification
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const landlords = await prisma.user.findMany({
      where: {
        role: "LANDLORD",
        verificationStatus: { in: ["UNVERIFIED", "UNDER_REVIEW", "REJECTED"] },
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

    const { landlordId, action, note } = await request.json();

    if (!landlordId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "landlordId and action (APPROVE | REJECT) are required." },
        { status: 400 },
      );
    }

    if (action === "REJECT" && !note?.trim()) {
      return NextResponse.json(
        { success: false, error: "A rejection reason is required so the landlord knows what to fix." },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: landlordId },
      data:  {
        verificationStatus: action === "APPROVE" ? "VERIFIED" : "REJECTED",
        verificationNote:   action === "REJECT" ? note.trim() : null,
      },
      select: { id: true, name: true, email: true, verificationStatus: true },
    });

    return NextResponse.json({
      success: true,
      data:    updated,
      message: action === "APPROVE"
        ? `${updated.name} has been verified.`
        : `${updated.name}'s verification was rejected.`,
    });
  } catch (error) {
    console.error("[ADMIN LANDLORDS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update landlord verification." }, { status: 500 });
  }
}
