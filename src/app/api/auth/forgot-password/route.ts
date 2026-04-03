/**
 * POST /api/auth/forgot-password
 *
 * Generates a signed, time-limited reset token and emails it to the user.
 *
 * Token design (stateless — no DB table needed):
 *   Payload: { sub: userId, email, pwdFragment: first-8-chars-of-bcrypt-hash, exp }
 *   Signed with NEXTAUTH_SECRET via HS256.
 *   The pwdFragment ensures the token is automatically invalidated once the
 *   password is successfully changed.
 */

import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const EXPIRY_SECONDS = 60 * 60; // 1 hour

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 },
      );
    }

    const normalised = email.trim().toLowerCase();

    // Always return the same response shape to prevent user enumeration
    const ok = NextResponse.json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });

    const user = await prisma.user.findUnique({ where: { email: normalised } });
    if (!user) return ok; // silently succeed

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback-secret");

    // Include the first 8 chars of the current hash so the token is invalidated
    // the moment the password is changed.
    const pwdFragment = user.password.slice(0, 8);

    const token = await new SignJWT({ sub: user.id, email: user.email, pwdFragment })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + EXPIRY_SECONDS)
      .sign(secret);

    // Fire-and-forget — email errors must not break the response
    sendPasswordResetEmail(user.email, user.name, token).catch((err) =>
      console.error("[forgot-password] email error:", err),
    );

    return ok;
  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
