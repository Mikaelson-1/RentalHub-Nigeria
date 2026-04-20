/**
 * lib/email.ts
 *
 * Nodemailer-based email utility for RentalHub.
 *
 * Required environment variables (add to .env.local):
 *   EMAIL_HOST     — SMTP host, e.g. smtp.gmail.com
 *   EMAIL_PORT     — SMTP port, e.g. 587
 *   EMAIL_USER     — SMTP username / sender address
 *   EMAIL_PASS     — SMTP password or app-specific password
 *   EMAIL_FROM     — Display name + address, e.g. "RentalHub <no-reply@rentalhub.ng>"
 *   NEXT_PUBLIC_APP_URL — Public base URL, e.g. https://rentalhub.ng
 */

import nodemailer from "nodemailer";
import { Role } from "@prisma/client";

// ── Transporter ─────────────────────────────────────────────────────────────

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT ?? "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn("[email] EMAIL_HOST / EMAIL_USER / EMAIL_PASS not set — emails will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env.EMAIL_FROM ?? "RentalHub <no-reply@rentalhub.ng>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// ── Shared send helper ───────────────────────────────────────────────────────

async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  // Preferred path: Resend API (if configured)
  if (RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const payload = await response.text();
        console.error("[email] Resend send failed:", response.status, payload);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[email] Resend transport error:", err);
      // fall through to SMTP attempt
    }
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.warn("[email] No email provider configured. Set RESEND_API_KEY or SMTP vars.");
    return false;
  }

  try {
    await transporter.sendMail({ from: FROM, ...options });
    return true;
  } catch (err) {
    // Log but never throw — email errors must not break primary flows
    console.error("[email] Failed to send email:", err);
    return false;
  }
}

// ── Shared HTML wrapper ──────────────────────────────────────────────────────

function wrap(title: string, body: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#192F59;padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">
              RentalHub
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} RentalHub · Ikere-Ekiti, Ekiti State
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Password Reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  await sendMail({
    to,
    subject: "Reset your RentalHub password",
    html: wrap("Reset your password", `
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your RentalHub account password. Click the button below to choose a new password.</p>
      <p style="margin:28px 0;">
        <a href="${resetUrl}"
           style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
      <p style="color:#6b7280;font-size:12px;word-break:break-all;">If the button above doesn't work, copy and paste this URL into your browser:<br/>${resetUrl}</p>
    `),
  });
}

// ── Account Email Verification OTP ──────────────────────────────────────────

export async function sendEmailVerificationOtp(options: {
  to: string;
  name: string;
  otpCode: string;
}) {
  const { to, name, otpCode } = options;
  const verifyUrl = `${APP_URL}/verify-email?email=${encodeURIComponent(to)}`;

  return await sendMail({
    to,
    subject: "Verify your RentalHub account",
    html: wrap("Email Verification", `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to RentalHub. Use the OTP code below to verify your account:</p>
      <p style="margin:20px 0;">
        <span style="display:inline-block;font-size:28px;letter-spacing:6px;font-weight:700;background:#fff7ed;color:#c2410c;padding:12px 18px;border-radius:10px;border:1px solid #fdba74;">
          ${otpCode}
        </span>
      </p>
      <p style="color:#6b7280;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="margin:28px 0;">
        <a href="${verifyUrl}"
           style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Verify My Account
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;">If you did not create this account, please ignore this email.</p>
    `),
  });
}

// ── Admin Account Event Notifications ───────────────────────────────────────

// V12: notify landlord when their payout bank details are changed.
// Contains masked account number + support contact for "not me" recovery.
export async function sendBankAccountChangedEmail(options: {
  to: string;
  name: string;
  bankName: string;
  maskedAccountNumber: string;
}) {
  const { to, name, bankName, maskedAccountNumber } = options;

  await sendMail({
    to,
    subject: "RentalHub — payout bank account changed",
    html: wrap("Bank Account Changed", `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your RentalHub payout bank account was just updated to:</p>
      <p style="background:#f8fafc;padding:16px;border-radius:8px;font-family:monospace;">
        ${bankName}<br>
        Account: ${maskedAccountNumber}
      </p>
      <p style="color:#991b1b;"><strong>If this wasn't you</strong>, contact support at
        <a href="mailto:support@rentalhub.ng" style="color:#E67E22;">support@rentalhub.ng</a> immediately.</p>
      <p style="color:#475569;font-size:13px;">For your safety, all rent payouts to this landlord account are paused for the next 24 hours while we verify the change.</p>
    `),
  });
}

export async function sendAccountSuspendedEmail(options: {
  to: string;
  name: string;
}) {
  const { to, name } = options;

  await sendMail({
    to,
    subject: "Your RentalHub account has been suspended",
    html: wrap("Account Suspended", `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account has been <strong style="color:#991b1b;">suspended</strong> by the platform admin.</p>
      <p>If you believe this is a mistake, please contact support at <a href="mailto:support@rentalhub.ng" style="color:#E67E22;">support@rentalhub.ng</a>.</p>
    `),
  });
}

export async function sendAccountUnsuspendedEmail(options: {
  to: string;
  name: string;
}) {
  const { to, name } = options;
  const loginUrl = `${APP_URL}/login`;

  await sendMail({
    to,
    subject: "Your RentalHub account has been reactivated",
    html: wrap("Account Reactivated", `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account has been reactivated and you can now sign in again.</p>
      <p style="margin:28px 0;">
        <a href="${loginUrl}" style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Sign In
        </a>
      </p>
    `),
  });
}

export async function sendRoleChangedEmail(options: {
  to: string;
  name: string;
  oldRole: Role;
  newRole: Role;
}) {
  const { to, name, oldRole, newRole } = options;
  const dashboardUrl =
    newRole === "ADMIN" ? `${APP_URL}/admin` :
    newRole === "LANDLORD" ? `${APP_URL}/landlord` :
    `${APP_URL}/student`;

  await sendMail({
    to,
    subject: "Your RentalHub account role was updated",
    html: wrap("Role Updated", `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account role has been updated by an admin.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Previous role</td><td style="padding:8px 0;">${oldRole}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">New role</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${newRole}</td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Open Dashboard
        </a>
      </p>
    `),
  });
}

// ── Booking Notifications ────────────────────────────────────────────────────

/** Sent to the landlord when a student makes a booking request */
export async function sendBookingRequestToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  studentName: string;
  propertyTitle: string;
  propertyLocation: string;
  bookingId: string;
}) {
  const { landlordEmail, landlordName, studentName, propertyTitle, propertyLocation, bookingId } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: `New booking request — ${propertyTitle}`,
    html: wrap("New Booking Request", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>You have a new booking request for your listing.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Location</td><td style="padding:8px 0;">${propertyLocation}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Student</td><td style="padding:8px 0;">${studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Booking Ref</td><td style="padding:8px 0;">${bookingId}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status</td><td style="padding:8px 0;"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">PENDING</span></td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}"
           style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View in Dashboard
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Log in to your landlord dashboard to accept or decline this request.</p>
    `),
  });
}

/** Sent to the student when the landlord confirms a booking */
export async function sendBookingConfirmedToStudent(options: {
  studentEmail: string;
  studentName: string;
  propertyTitle: string;
  propertyLocation: string;
  landlordName: string;
}) {
  const { studentEmail, studentName, propertyTitle, propertyLocation, landlordName } = options;
  const dashboardUrl = `${APP_URL}/student`;

  await sendMail({
    to: studentEmail,
    subject: `Booking confirmed — ${propertyTitle}`,
    html: wrap("Booking Confirmed 🎉", `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Great news! Your booking request has been <strong style="color:#16a34a;">confirmed</strong> by the landlord.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Location</td><td style="padding:8px 0;">${propertyLocation}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Landlord</td><td style="padding:8px 0;">${landlordName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status</td><td style="padding:8px 0;"><span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">CONFIRMED</span></td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}"
           style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View My Bookings
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Next step: the landlord will reach out to you directly to arrange payment and move-in details.</p>
    `),
  });
}

/** Sent to the student when a booking is cancelled */
export async function sendBookingCancelledToStudent(options: {
  studentEmail: string;
  studentName: string;
  propertyTitle: string;
  propertyLocation: string;
  cancelledBy: "student" | "landlord";
}) {
  const { studentEmail, studentName, propertyTitle, propertyLocation, cancelledBy } = options;
  const dashboardUrl = `${APP_URL}/student`;
  const reason = cancelledBy === "landlord"
    ? "The landlord has declined your booking request."
    : "You have cancelled your booking request.";

  await sendMail({
    to: studentEmail,
    subject: `Booking cancelled — ${propertyTitle}`,
    html: wrap("Booking Cancelled", `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>${reason}</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Location</td><td style="padding:8px 0;">${propertyLocation}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status</td><td style="padding:8px 0;"><span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">CANCELLED</span></td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}"
           style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Browse Other Properties
        </a>
      </p>
      ${cancelledBy === "landlord" ? '<p style="color:#6b7280;font-size:13px;">You can browse other available properties and submit a new booking request.</p>' : ""}
    `),
  });
}

/** Sent to the landlord when a student cancels a booking */
export async function sendBookingCancelledToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  studentName: string;
  propertyTitle: string;
  propertyLocation: string;
}) {
  const { landlordEmail, landlordName, studentName, propertyTitle, propertyLocation } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: `Booking cancelled — ${propertyTitle}`,
    html: wrap("Booking Cancelled", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>A student has cancelled their booking request for your listing.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Location</td><td style="padding:8px 0;">${propertyLocation}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Student</td><td style="padding:8px 0;">${studentName}</td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}"
           style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Dashboard
        </a>
      </p>
    `),
  });
}

// ── Property Review Notifications ────────────────────────────────────────────

/** Sent to the landlord when their property is approved */
export async function sendPropertyApprovedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  propertyTitle: string;
  propertyId: string;
}) {
  const { landlordEmail, landlordName, propertyTitle, propertyId } = options;
  const propertyUrl = `${APP_URL}/properties/${propertyId}`;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: `Your listing has been approved — ${propertyTitle}`,
    html: wrap("Listing Approved ✅", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>Congratulations! Your property listing has been <strong style="color:#16a34a;">approved</strong> and is now live on RentalHub.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status</td><td style="padding:8px 0;"><span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">APPROVED</span></td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${propertyUrl}"
           style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Live Listing
        </a>
        &nbsp;&nbsp;
        <a href="${dashboardUrl}"
           style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          My Dashboard
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Students can now discover and book your property through RentalHub.</p>
    `),
  });
}

/** Sent to the landlord when their property is rejected */
export async function sendPropertyRejectedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  propertyTitle: string;
  reviewNote: string;
}) {
  const { landlordEmail, landlordName, propertyTitle, reviewNote } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: `Listing update required — ${propertyTitle}`,
    html: wrap("Listing Not Approved", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>After review, your property listing requires some changes before it can be published on RentalHub.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status</td><td style="padding:8px 0;"><span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">REJECTED</span></td></tr>
      </table>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;"><strong>Reviewer's note:</strong><br/>${reviewNote}</p>
      </div>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}"
           style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Dashboard
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Please address the feedback above and submit a new listing. If you have questions, contact our support team at <a href="mailto:support@rentalhub.ng" style="color:#E67E22;">support@rentalhub.ng</a>.</p>
    `),
  });
}

// ── Verification Notifications ───────────────────────────────────────────────

/** Sent to admin when a landlord submits verification documents */
export async function sendVerificationSubmittedToAdmin(options: {
  adminEmail: string;
  landlordName: string;
  landlordEmail: string;
  submittedAt: string;
}) {
  const { adminEmail, landlordName, landlordEmail, submittedAt } = options;
  const adminUrl = `${APP_URL}/admin`;

  await sendMail({
    to: adminEmail,
    subject: `Verification documents submitted — ${landlordName}`,
    html: wrap("New Verification Submission", `
      <p>Hi Admin,</p>
      <p>A landlord has submitted their verification documents and is awaiting review.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${landlordName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;">${landlordEmail}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Submitted</td><td style="padding:8px 0;">${submittedAt}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status</td><td style="padding:8px 0;"><span style="background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">UNDER REVIEW</span></td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${adminUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Review in Admin Dashboard
        </a>
      </p>
    `),
  });
}

/** Sent to landlord after verification documents are submitted */
export async function sendVerificationSubmissionReceivedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
}) {
  const { landlordEmail, landlordName } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: "Verification submitted — under review",
    html: wrap("Verification Submitted", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>We received your verification documents successfully.</p>
      <p>Your account is now under review. This typically takes <strong>24–48 hours</strong>.</p>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Go to Dashboard
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">We will notify you by email once a decision is made.</p>
    `),
  });
}

/** Sent to landlord when verification is approved */
export async function sendVerificationApprovedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
}) {
  const { landlordEmail, landlordName } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: "Your landlord account is now verified",
    html: wrap("Verification Approved ✅", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>Great news — your landlord account verification has been <strong style="color:#16a34a;">approved</strong>.</p>
      <p>You can now receive higher-trust visibility for your listings and continue managing bookings.</p>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Open Dashboard
        </a>
      </p>
    `),
  });
}

/** Sent to landlord when admin rejects their verification */
export async function sendVerificationRejectedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  rejectionNote: string;
}) {
  const { landlordEmail, landlordName, rejectionNote } = options;
  const verificationUrl = `${APP_URL}/landlord/verification`;

  await sendMail({
    to: landlordEmail,
    subject: "Your verification was not approved — action required",
    html: wrap("Verification Not Approved", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>Unfortunately, your identity and property verification could not be approved at this time.</p>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;"><strong>Reason:</strong><br/>${rejectionNote}</p>
      </div>
      <p>Please address the feedback above and resubmit your documents.</p>
      <p style="margin:28px 0;">
        <a href="${verificationUrl}" style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Resubmit Documents
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">If you have questions, contact us at <a href="mailto:support@rentalhub.ng" style="color:#E67E22;">support@rentalhub.ng</a>.</p>
    `),
  });
}

/** Sent to student when payment is confirmed */
export async function sendPaymentConfirmedToStudent(options: {
  studentEmail: string;
  studentName: string;
  propertyTitle: string;
  propertyLocation: string;
  landlordName: string;
  landlordPhone: string;
  amount: string;
  paystackRef: string;
  moveInDate?: string;
  bookingId: string;
}) {
  const { studentEmail, studentName, propertyTitle, propertyLocation, landlordName, landlordPhone, amount, paystackRef, moveInDate, bookingId } = options;
  const receiptUrl = `${APP_URL}/student/bookings/${bookingId}/receipt`;

  await sendMail({
    to: studentEmail,
    subject: `Payment confirmed — ${propertyTitle}`,
    html: wrap("Payment Confirmed", `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your payment has been received and your accommodation is now <strong style="color:#16a34a;">secured</strong>!</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Location</td><td style="padding:8px 0;">${propertyLocation}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount Paid</td><td style="padding:8px 0;font-weight:600;">&#8358;${amount}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Reference</td><td style="padding:8px 0;font-family:monospace;font-size:13px;">${paystackRef}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Landlord</td><td style="padding:8px 0;">${landlordName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Landlord Phone</td><td style="padding:8px 0;">${landlordPhone || 'Contact via dashboard'}</td></tr>
        ${moveInDate ? `<tr><td style="padding:8px 0;color:#6b7280;">Move-in Date</td><td style="padding:8px 0;font-weight:600;">${moveInDate}</td></tr>` : ''}
      </table>
      <p style="margin:28px 0;">
        <a href="${receiptUrl}" style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Receipt
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Keep this email as proof of payment. Contact the landlord directly to arrange move-in.</p>
    `),
  });
}

/** Sent to landlord when a student's payment is confirmed */
export async function sendPaymentReceivedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  studentName: string;
  propertyTitle: string;
  amount: string;
  paystackRef: string;
}) {
  const { landlordEmail, landlordName, studentName, propertyTitle, amount, paystackRef } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: `Payment received — ${propertyTitle}`,
    html: wrap("Payment Received", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>A student has completed payment for your property. The booking is now fully confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Student</td><td style="padding:8px 0;">${studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:600;">&#8358;${amount}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Reference</td><td style="padding:8px 0;font-family:monospace;font-size:13px;">${paystackRef}</td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Dashboard
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Please reach out to the student to coordinate move-in details.</p>
    `),
  });
}

/** Sent to student when booking expires (unpaid after 48h) */
export async function sendBookingExpiredToStudent(options: {
  studentEmail: string;
  studentName: string;
  propertyTitle: string;
}) {
  const { studentEmail, studentName, propertyTitle } = options;
  const browseUrl = `${APP_URL}/properties`;

  await sendMail({
    to: studentEmail,
    subject: `Booking expired — ${propertyTitle}`,
    html: wrap("Booking Expired", `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your booking for <strong>${propertyTitle}</strong> has expired because payment was not completed within 48 hours.</p>
      <p>The property may still be available. Browse and book again to secure your accommodation.</p>
      <p style="margin:28px 0;">
        <a href="${browseUrl}" style="background:#E67E22;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Browse Properties
        </a>
      </p>
    `),
  });
}

/** Sent to student when they confirm move-in */
export async function sendMoveInConfirmedToStudent(options: {
  studentEmail: string;
  studentName: string;
  propertyTitle: string;
  propertyLocation: string;
  landlordName: string;
  movedInDate: string;
}) {
  const { studentEmail, studentName, propertyTitle, propertyLocation, landlordName, movedInDate } = options;
  const dashboardUrl = `${APP_URL}/student`;

  await sendMail({
    to: studentEmail,
    subject: `Move-in confirmed — ${propertyTitle}`,
    html: wrap("Move-In Confirmed", `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>We have received your move-in confirmation. RentalHub will now process the release of your rent payment to the landlord.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Location</td><td style="padding:8px 0;">${propertyLocation}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Landlord</td><td style="padding:8px 0;">${landlordName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Move-in Date</td><td style="padding:8px 0;font-weight:600;">${movedInDate}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;">Your landlord will be notified. You will receive a confirmation once the payment has been released.</p>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Dashboard
        </a>
      </p>
    `),
  });
}

/** Sent to landlord when a student confirms move-in */
export async function sendMoveInConfirmedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  studentName: string;
  propertyTitle: string;
  amount: string;
  movedInDate: string;
}) {
  const { landlordEmail, landlordName, studentName, propertyTitle, amount, movedInDate } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: `Tenant moved in — ${propertyTitle}`,
    html: wrap("Tenant Has Moved In", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>Your tenant <strong>${studentName}</strong> has confirmed their move-in. RentalHub is processing the release of their rent payment to your bank account.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Tenant</td><td style="padding:8px 0;">${studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:600;">&#8358;${amount}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Move-in Date</td><td style="padding:8px 0;">${movedInDate}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;">You will receive a separate email once the payment has been transferred to your bank account.</p>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Dashboard
        </a>
      </p>
    `),
  });
}

/** Sent to landlord when admin releases the payout */
export async function sendPayoutReleasedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  studentName: string;
  propertyTitle: string;
  amount: string;
  bankName: string;
  accountName: string;
}) {
  const { landlordEmail, landlordName, studentName, propertyTitle, amount, bankName, accountName } = options;
  const dashboardUrl = `${APP_URL}/landlord`;

  await sendMail({
    to: landlordEmail,
    subject: `Rent payment transferred — ${propertyTitle}`,
    html: wrap("Rent Payment Transferred", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>Your rent payment has been released and transferred to your bank account.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Tenant</td><td style="padding:8px 0;">${studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:600;color:#16a34a;">&#8358;${amount}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Bank</td><td style="padding:8px 0;">${bankName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Account Name</td><td style="padding:8px 0;">${accountName}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;">Please allow 1–3 business days for the funds to reflect in your account. If you have questions, contact <a href="mailto:support@rentalhub.ng" style="color:#E67E22;">support@rentalhub.ng</a>.</p>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Dashboard
        </a>
      </p>
    `),
  });
}

/** Sent to student when admin releases the payout to landlord */
export async function sendPayoutReleasedToStudent(options: {
  studentEmail: string;
  studentName: string;
  propertyTitle: string;
  landlordName: string;
  amount: string;
}) {
  const { studentEmail, studentName, propertyTitle, landlordName, amount } = options;
  const dashboardUrl = `${APP_URL}/student`;

  await sendMail({
    to: studentEmail,
    subject: `Payment released to landlord — ${propertyTitle}`,
    html: wrap("Payment Released to Landlord", `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your rent payment has been successfully released to your landlord. Your tenancy is now fully active.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Landlord</td><td style="padding:8px 0;">${landlordName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:600;">&#8358;${amount}</td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          View Dashboard
        </a>
      </p>
    `),
  });
}

/** Sent to landlord when a payout fails */
export async function sendPayoutFailedToLandlord(options: {
  landlordEmail: string;
  landlordName: string;
  propertyTitle: string;
  amount: string;
}) {
  const { landlordEmail, landlordName, propertyTitle, amount } = options;

  await sendMail({
    to: landlordEmail,
    subject: `Payout issue — ${propertyTitle}`,
    html: wrap("Payout Issue", `
      <p>Hi <strong>${landlordName}</strong>,</p>
      <p>We encountered an issue releasing your rent payment for <strong>${propertyTitle}</strong>. Our support team is investigating and will contact you shortly.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Property</td><td style="padding:8px 0;font-weight:600;color:#192F59;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:600;">&#8358;${amount}</td></tr>
      </table>
      <p>Please contact us at <a href="mailto:support@rentalhub.ng" style="color:#E67E22;">support@rentalhub.ng</a> if you do not hear back within 24 hours.</p>
    `),
  });
}

/** Sent to student when a payout to their landlord fails */
export async function sendPayoutFailedToStudent(options: {
  studentEmail: string;
  studentName: string;
  propertyTitle: string;
}) {
  const { studentEmail, studentName, propertyTitle } = options;

  await sendMail({
    to: studentEmail,
    subject: `Payment release issue — ${propertyTitle}`,
    html: wrap("Payment Release Issue", `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>There was an issue releasing the payment for <strong>${propertyTitle}</strong> to your landlord. Our support team is on it and will resolve this as soon as possible.</p>
      <p>Please contact us at <a href="mailto:support@rentalhub.ng" style="color:#E67E22;">support@rentalhub.ng</a> if you have concerns.</p>
    `),
  });
}

/** Admin-only utility for checking provider delivery from runtime */
export async function sendTestEmail(options: {
  to: string;
  requestedBy?: string;
}) {
  const { to, requestedBy } = options;
  const dashboardUrl = `${APP_URL}/admin`;

  await sendMail({
    to,
    subject: "RentalHub email test",
    html: wrap("Email Test", `
      <p>This is a test email from RentalHub.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Recipient</td><td style="padding:8px 0;">${to}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Provider mode</td><td style="padding:8px 0;">${RESEND_API_KEY ? "Resend API" : "SMTP fallback"}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Requested by</td><td style="padding:8px 0;">${requestedBy ?? "Unknown"}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="padding:8px 0;">${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td></tr>
      </table>
      <p style="margin:28px 0;">
        <a href="${dashboardUrl}" style="background:#192F59;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
          Open Admin Dashboard
        </a>
      </p>
    `),
  });
}
