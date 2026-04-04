/**
 * GET  /api/student/profile  — Fetch authenticated student's profile
 * PATCH /api/student/profile — Update name, phone, avatar
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    if (session.user.role !== "STUDENT") return NextResponse.json({ success: false, error: "Students only." }, { status: 403 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    if (!user) return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[STUDENT PROFILE GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    if (session.user.role !== "STUDENT") return NextResponse.json({ success: false, error: "Students only." }, { status: 403 });

    const body = await request.json();
    const { name, phoneNumber, avatarUrl } = body;

    // Avatar-only update path
    if (avatarUrl !== undefined && !name && phoneNumber === undefined) {
      const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: { avatarUrl: avatarUrl || null },
        select: { id: true, name: true, email: true, phoneNumber: true, avatarUrl: true },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      },
      select: { id: true, name: true, email: true, phoneNumber: true, avatarUrl: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STUDENT PROFILE PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update profile." }, { status: 500 });
  }
}
