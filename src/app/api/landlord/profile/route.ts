import { NextResponse } from "next/server";
import { getAuthenticatedSession, apiError, apiSuccess } from "@/lib/api-utils";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const { session, error, status } = await getAuthenticatedSession(UserRole.LANDLORD);
    if (error) return apiError(error, status!);

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        phoneNumber: true,
        avatarUrl: true,
        createdAt: true,
        governmentIdUrl: true,
        selfieUrl: true,
        ownershipProofUrl: true,
        verificationSubmittedAt: true,
        verificationNote: true,
        _count: { select: { properties: true, bookings: true } },
      },
    });

    if (!user) return apiError("User not found.", 404);
    return apiSuccess(user);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PROFILE GET ERROR]", msg);
    return apiError("Failed to load profile.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, error, status } = await getAuthenticatedSession(UserRole.LANDLORD);
    if (error) return apiError(error, status!);

    const body = await request.json();
    const { name, email, phoneNumber, avatarUrl } = body;

    if (avatarUrl !== undefined && !name && !email && phoneNumber === undefined) {
      const updated = await prisma.user.update({
        where: { id: session!.user.id },
        data: { avatarUrl: avatarUrl || null },
        select: { id: true, name: true, email: true, phoneNumber: true, avatarUrl: true, role: true, verificationStatus: true, createdAt: true },
      });
      return apiSuccess(updated);
    }

    if (!name?.trim()) {
      return apiError("Name is required.", 400);
    }

    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return apiError("A valid email is required.", 400);
    }

    if (normalizedEmail !== session!.user.email) {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return apiError("That email is already in use by another account.", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: session!.user.id },
      data: {
        name: name.trim(),
        email: normalizedEmail,
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("[PROFILE PATCH ERROR]", error);
    return apiError("Failed to update profile.", 500);
  }
}
