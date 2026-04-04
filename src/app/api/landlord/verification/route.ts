/**
 * GET  /api/landlord/verification  — Fetch current landlord's verification state
 * POST /api/landlord/verification  — Submit / update verification documents
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    if (session.user.role !== "LANDLORD") {
      return NextResponse.json({ success: false, error: "Landlords only." }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        verificationStatus:      true,
        phoneNumber:             true,
        phoneVerified:           true,
        governmentIdUrl:         true,
        selfieUrl:               true,
        isDirectOwner:           true,
        landlordAware:           true,
        ownershipProofUrl:       true,
        verificationNote:        true,
        verificationSubmittedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[VERIFICATION GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch verification status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    if (session.user.role !== "LANDLORD") {
      return NextResponse.json({ success: false, error: "Landlords only." }, { status: 403 });
    }

    const body = await request.json();
    const {
      phoneNumber,
      governmentIdUrl,
      selfieUrl,
      isDirectOwner,
      landlordAware,
      ownershipProofUrl,
    } = body;

    // Validate required fields
    const missing: string[] = [];
    if (!phoneNumber?.trim())    missing.push("phone number");
    if (!governmentIdUrl?.trim()) missing.push("government ID");
    if (!selfieUrl?.trim())      missing.push("selfie / photo");
    if (isDirectOwner === undefined || isDirectOwner === null) missing.push("ownership declaration");
    if (!isDirectOwner && !landlordAware) missing.push("landlord consent confirmation");
    if (!ownershipProofUrl?.trim()) missing.push("proof of ownership / authorisation");

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(", ")}.` },
        { status: 400 },
      );
    }

    // Check the user isn't already verified or under review
    const current = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { verificationStatus: true },
    });

    if (current?.verificationStatus === "VERIFIED") {
      return NextResponse.json({ success: false, error: "Your account is already verified." }, { status: 409 });
    }
    if (current?.verificationStatus === "UNDER_REVIEW") {
      return NextResponse.json(
        { success: false, error: "Your documents are already under review. We'll notify you soon." },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data:  {
        phoneNumber:             phoneNumber.trim(),
        governmentIdUrl,
        selfieUrl,
        isDirectOwner,
        landlordAware:           isDirectOwner ? true : !!landlordAware,
        ownershipProofUrl,
        verificationStatus:      "UNDER_REVIEW",
        verificationNote:        null, // clear any previous rejection note
        verificationSubmittedAt: new Date(),
      },
      select: { verificationStatus: true, verificationSubmittedAt: true },
    });

    return NextResponse.json({
      success: true,
      data:    updated,
      message: "Verification documents submitted. Our team will review them within 24–48 hours.",
    });
  } catch (error) {
    console.error("[VERIFICATION POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to submit verification." }, { status: 500 });
  }
}
