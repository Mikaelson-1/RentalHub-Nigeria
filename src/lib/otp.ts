import { createHash, randomInt } from "crypto";
import prisma from "@/lib/prisma";

const OTP_EXPIRY_MINUTES = 10;

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function createEmailOtp(userId: string, email: string): Promise<string> {
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailOtp.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  await prisma.emailOtp.create({
    data: {
      userId,
      email,
      codeHash,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerificationSentAt: new Date() },
  });

  return code;
}

export async function verifyEmailOtp(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const codeHash = hashOtpCode(code.trim());

  const otp = await prisma.emailOtp.findFirst({
    where: {
      email: normalizedEmail,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!otp) {
    return { success: false as const, error: "OTP is invalid or has expired." };
  }

  if (otp.codeHash !== codeHash) {
    return { success: false as const, error: "Incorrect OTP code." };
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: otp.userId },
      data: { emailVerified: true },
      select: { id: true, emailVerified: true, role: true },
    }),
    prisma.emailOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    }),
    prisma.emailOtp.deleteMany({
      where: {
        userId: otp.userId,
        usedAt: null,
      },
    }),
  ]);

  return { success: true as const, user: updatedUser };
}

