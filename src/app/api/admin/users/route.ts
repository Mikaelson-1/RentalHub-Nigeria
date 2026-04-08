import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  sendAccountSuspendedEmail,
  sendAccountUnsuspendedEmail,
  sendRoleChangedEmail,
} from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

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

type AdminUserAction = "SUSPEND" | "UNSUSPEND" | "CHANGE_ROLE";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const action = body?.action as AdminUserAction;
    const nextRole = body?.role as Role | undefined;

    if (!userId || !["SUSPEND", "UNSUSPEND", "CHANGE_ROLE"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "userId and valid action (SUSPEND | UNSUSPEND | CHANGE_ROLE) are required." },
        { status: 400 },
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json({ success: false, error: "You cannot modify your own account from this action." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, verificationStatus: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    if (action === "CHANGE_ROLE") {
      if (!nextRole || !["STUDENT", "LANDLORD", "ADMIN"].includes(nextRole)) {
        return NextResponse.json({ success: false, error: "A valid target role is required." }, { status: 400 });
      }
      if (nextRole === user.role) {
        return NextResponse.json({ success: false, error: "User already has this role." }, { status: 409 });
      }

      const oldRole = user.role;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          role: nextRole,
          verificationStatus: nextRole === "LANDLORD" ? "UNVERIFIED" : "VERIFIED",
        },
        select: { id: true, name: true, email: true, role: true },
      });

      sendRoleChangedEmail({
        to: updated.email,
        name: updated.name,
        oldRole,
        newRole: updated.role,
      }).catch((error) => console.error("[email] role changed notification failed:", error));

      await notifyUser({
        userId: updated.id,
        type: "ACCOUNT",
        title: "Account role updated",
        message: `Your account role changed from ${oldRole} to ${updated.role}.`,
        link: updated.role === "ADMIN" ? "/admin" : updated.role === "LANDLORD" ? "/landlord" : "/student",
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `${updated.name} role changed to ${updated.role}.`,
      });
    }

    const suspended = action === "SUSPEND";
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: suspended ? "SUSPENDED" : "VERIFIED" },
      select: { id: true, name: true, email: true, role: true, verificationStatus: true },
    });

    if (suspended) {
      sendAccountSuspendedEmail({
        to: updated.email,
        name: updated.name,
      }).catch((error) => console.error("[email] account suspended notification failed:", error));
    } else {
      sendAccountUnsuspendedEmail({
        to: updated.email,
        name: updated.name,
      }).catch((error) => console.error("[email] account unsuspended notification failed:", error));
    }

    await notifyUser({
      userId: updated.id,
      type: "ACCOUNT",
      title: suspended ? "Account suspended" : "Account reactivated",
      message: suspended
        ? "Your account has been suspended by admin."
        : "Your account has been reactivated by admin.",
      link: "/login",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: suspended ? `${updated.name} has been suspended.` : `${updated.name} has been reactivated.`,
    });
  } catch (error) {
    console.error("[ADMIN USERS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to update user account." }, { status: 500 });
  }
}
