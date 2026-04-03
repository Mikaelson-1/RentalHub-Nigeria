import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            properties: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("[ADMIN USERS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users." }, { status: 500 });
  }
}
