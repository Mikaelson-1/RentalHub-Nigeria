/**
 * GET  /api/landlord/profile  — Fetch current landlord's profile
 * PATCH /api/landlord/profile  — Update name, email, or phoneNumber
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        phoneNumber: true,
        createdAt: true,
        governmentIdUrl: true,
        selfieUrl: true,
        ownershipProofUrl: true,
        verificationSubmittedAt: true,
        verificationNote: true,
        _count: { select: { properties: true, bookings: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[PROFILE GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to load profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phoneNumber } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }

    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ success: false, error: "A valid email is required." }, { status: 400 });
    }

    // Check email uniqueness if changed
    if (normalizedEmail !== session.user.email) {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "That email is already in use by another account." },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        email: normalizedEmail,
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber.trim() || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PROFILE PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update profile." }, { status: 500 });
  }
}
