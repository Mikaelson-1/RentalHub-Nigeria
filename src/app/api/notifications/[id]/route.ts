import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Notification not found." }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[NOTIFICATION PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to mark notification as read." }, { status: 500 });
  }
}

