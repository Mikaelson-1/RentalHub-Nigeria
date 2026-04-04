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

    // Build location filter when a school is selected
    const locationFilter =
      school && SCHOOL_LOCATION_KEYWORDS[school]
        ? {
            location: {
              OR: SCHOOL_LOCATION_KEYWORDS[school].map((kw) => ({
                name: { contains: kw, mode: "insensitive" as const },
              })),
            },
          }
        : {};

    const [totalProperties, pendingApprovals, totalBookings, totalUsers] = await Promise.all([
      prisma.property.count({ where: { ...locationFilter } }),
      prisma.property.count({ where: { status: "PENDING", ...locationFilter } }),
      prisma.booking.count({
        where: school ? { property: { ...locationFilter } } : {},
      }),
      // Users: platform-wide or those with at least one property in the school
      school
        ? prisma.user.count({
            where: {
              OR: [
                { properties: { some: { ...locationFilter } } },
                { bookings: { some: { property: { ...locationFilter } } } },
              ],
            },
          })
        : prisma.user.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: { totalProperties, pendingApprovals, totalUsers, totalBookings },
    });
  } catch (error) {
    console.error("[ADMIN SUMMARY GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch admin summary." }, { status: 500 });
  }
}
