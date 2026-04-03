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

// ── Shared send helper ───────────────────────────────────────────────────────

async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = createTransporter();
  if (!transporter) return; // silently skip if not configured

  try {
    await transporter.sendMail({ from: FROM, ...options });
  } catch (err) {
    // Log but never throw — email errors must not break primary flows
    console.error("[email] Failed to send email:", err);
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
              RentalHub <span style="color:#E67E22;">NG</span>
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
              © ${new Date().getFullYear()} RentalHub NG · Ikere-Ekiti, Ekiti State
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
