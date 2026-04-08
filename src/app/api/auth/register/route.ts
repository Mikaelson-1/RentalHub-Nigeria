/**
 * POST /api/auth/register
 *
 * Register a new user (STUDENT or LANDLORD).
 * Admins can only be created via the seed script or direct DB access.
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { createEmailOtp } from '@/lib/otp';
import { sendEmailVerificationOtp } from '@/lib/email';
import { notifyUser } from '@/lib/notifications';

type AllowedRole = 'STUDENT' | 'LANDLORD';

interface RegisterBody {
  name:     string;
  email:    string;
  password: string;
  role?:    unknown; // validated explicitly before use
}

export async function POST(request: Request) {
  try {
    // Rate limit: 5 registration attempts per IP per 15 minutes
    const rl = rateLimit(getRateLimitKey(request, 'register'), { limit: 5, windowSeconds: 900 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Too many registration attempts. Try again in ${rl.retryAfter} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      );
    }

    const body: RegisterBody = await request.json();
    const { name, email, password } = body;
    const rawRole = body.role;

    // Validation
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required.' },
        { status: 400 },
      );
    }

    const ALLOWED_ROLES: AllowedRole[] = ['STUDENT', 'LANDLORD'];
    if (typeof rawRole !== 'string' || !ALLOWED_ROLES.includes(rawRole as AllowedRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Choose STUDENT or LANDLORD.' },
        { status: 400 },
      );
    }
    const role: AllowedRole = rawRole as AllowedRole;

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check uniqueness
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name:  name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role,
        emailVerified: false,
        // Landlords start UNVERIFIED for document verification.
        verificationStatus: role === 'LANDLORD' ? 'UNVERIFIED' : 'VERIFIED',
      },
      select: {
        id:                 true,
        name:               true,
        email:              true,
        role:               true,
        verificationStatus: true,
        createdAt:          true,
      },
    });

    const otp = await createEmailOtp(user.id, user.email);
    sendEmailVerificationOtp({
      to: user.email,
      name: user.name,
      otpCode: otp,
    }).catch((err) => logger.error("[REGISTER OTP EMAIL ERROR]", { error: String(err) }));

    await notifyUser({
      userId: user.id,
      type: "ACCOUNT",
      title: "Verify your email",
      message: "Use the OTP sent to your email to verify your account before logging in.",
      link: `/verify-email?email=${encodeURIComponent(user.email)}`,
    });

    return NextResponse.json(
      {
        success: true,
        data: user,
        message: "Account created. Check your email for OTP verification.",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
    const inferredCode = (message.match(/P\d{4}/)?.[0] ?? undefined) as string | undefined;

    logger.error('[REGISTER ERROR]', { code: code ?? inferredCode, error: message });

    // Duplicate unique key, usually email race-condition.
    if (code === 'P2002' || inferredCode === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }

    // Missing table/column because DB schema is behind deployed code.
    if (code === 'P2021' || code === 'P2022' || inferredCode === 'P2021' || inferredCode === 'P2022') {
      return NextResponse.json(
        { success: false, error: 'Registration is temporarily unavailable. Database schema is outdated.' },
        { status: 503 },
      );
    }

    // DB connectivity/auth/env config issues.
    if (
      code === 'P1000' ||
      code === 'P1001' ||
      code === 'P1003' ||
      inferredCode === 'P1000' ||
      inferredCode === 'P1001' ||
      inferredCode === 'P1003' ||
      message.includes('DATABASE_URL') ||
      message.includes("Can't reach database server")
    ) {
      return NextResponse.json(
        { success: false, error: 'Registration is temporarily unavailable. Please try again shortly.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again.' },
      { status: 500 },
    );
  }
}
