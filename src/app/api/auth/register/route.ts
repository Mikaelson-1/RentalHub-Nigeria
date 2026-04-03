/**
 * POST /api/auth/register
 *
 * Register a new user (STUDENT or LANDLORD).
 * Admins can only be created via the seed script or direct DB access.
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import type { Role } from '@prisma/client';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

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
        verificationStatus: 'VERIFIED',
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

    return NextResponse.json(
      { success: true, data: user, message: 'Account created successfully.' },
      { status: 201 },
    );
  } catch (error) {
    logger.error('[REGISTER ERROR]', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again.' },
      { status: 500 },
    );
  }
}
