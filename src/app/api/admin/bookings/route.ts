import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SCHOOL_LOCATION_KEYWORDS } from "@/lib/schools";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");

    const locationFilter =
      school && SCHOOL_LOCATION_KEYWORDS[school]
        ? {
            property: {
              location: {
                OR: SCHOOL_LOCATION_KEYWORDS[school].map((kw) => ({
                  name: { contains: kw, mode: "insensitive" as const },
                })),
              },
            },
          }
        : {};

    const bookings = await prisma.booking.findMany({
      where: locationFilter,
      include: {
        student: { select: { name: true, email: true } },
        property: {
          select: {
            id: true,
            title: true,
            location: { select: { name: true } },
            landlord: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error("[ADMIN BOOKINGS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bookings." }, { status: 500 });
  }
}
