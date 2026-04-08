import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(30, Math.max(1, Number(searchParams.get("limit") ?? "12")));
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where = {
      userId: session.user.id,
      ...(unreadOnly && { readAt: null }),
    };

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          readAt: null,
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: { items, unreadCount } });
  } catch (error) {
    console.error("[NOTIFICATIONS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action !== "readAll") {
      return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    console.error("[NOTIFICATIONS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update notifications." }, { status: 500 });
  }
}

