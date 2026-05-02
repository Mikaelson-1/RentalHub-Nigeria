import { NextResponse } from "next/server";
import { getAuthenticatedSession, apiError, apiSuccess } from "@/lib/api-utils";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const { session, error, status } = await getAuthenticatedSession(UserRole.STUDENT);
    if (error) return apiError(error, status!);

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
    });

    if (!user) return apiError("User not found.", 404);
    return apiSuccess(user);
  } catch (error) {
    console.error("[STUDENT PROFILE GET ERROR]", error);
    return apiError("Failed to fetch profile.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, error, status } = await getAuthenticatedSession(UserRole.STUDENT);
    if (error) return apiError(error, status!);

    const body = await request.json();
    const { name, phoneNumber, avatarUrl } = body;

    if (avatarUrl !== undefined && !name && phoneNumber === undefined) {
      const updated = await prisma.user.update({
        where: { id: session!.user.id },
        data: { avatarUrl: avatarUrl || null },
        select: { id: true, name: true, email: true, phoneNumber: true, avatarUrl: true },
      });
      return apiSuccess(updated);
    }

    if (!name?.trim()) {
      return apiError("Name is required.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: session!.user.id },
      data: {
        name: name.trim(),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      },
      select: { id: true, name: true, email: true, phoneNumber: true, avatarUrl: true },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("[STUDENT PROFILE PATCH ERROR]", error);
    return apiError("Failed to update profile.", 500);
  }
}
