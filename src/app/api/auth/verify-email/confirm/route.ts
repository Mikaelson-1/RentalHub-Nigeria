import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyEmailOtp } from "@/lib/otp";
import { notifyUser } from "@/lib/notifications";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(getRateLimitKey(request, "verify-email-confirm"), {
      limit: 10,
      windowSeconds: 15 * 60,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Too many attempts. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 },
      );
    }

    const { email, otp } = await request.json();
    if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
      return NextResponse.json({ success: false, error: "Email and OTP are required." }, { status: 400 });
    }

    const result = await verifyEmailOtp(email, otp);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { id: true, role: true },
    });

    if (user) {
      await notifyUser({
        userId: user.id,
        type: "ACCOUNT",
        title: "Email verified",
        message: "Your account email has been verified successfully.",
        link: user.role === "LANDLORD" ? "/landlord" : "/student",
      });
    }

    return NextResponse.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("[VERIFY EMAIL CONFIRM ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to verify email." }, { status: 500 });
  }
}

