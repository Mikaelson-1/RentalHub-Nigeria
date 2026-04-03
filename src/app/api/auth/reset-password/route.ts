/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and updates the user's password.
 *
 * Body: { token: string; password: string }
 */

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

interface ResetTokenPayload {
  sub: string;
  email: string;
  pwdFragment: string;
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Reset token is required." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    // Verify the JWT
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback-secret");
    let payload: ResetTokenPayload;

    try {
      const { payload: raw } = await jwtVerify(token, secret);
      payload = raw as unknown as ResetTokenPayload;
    } catch {
      return NextResponse.json(
        { success: false, error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Load user
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.email !== payload.email) {
      return NextResponse.json(
        { success: false, error: "This reset link is invalid. Please request a new one." },
        { status: 400 },
      );
    }

    // Check that the token hasn't already been used
    // (pwdFragment changes as soon as the password is updated)
    if (user.password.slice(0, 8) !== payload.pwdFragment) {
      return NextResponse.json(
        {
          success: false,
          error: "This reset link has already been used. Please request a new one.",
        },
        { status: 400 },
      );
    }

    // Hash the new password and save
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
