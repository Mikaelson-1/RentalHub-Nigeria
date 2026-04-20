/**
 * GET  /api/landlord/bank-account  — fetch current bank account details
 * POST /api/landlord/bank-account  — save bank account + create Paystack transfer recipient
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBankAccountChangedEmail } from "@/lib/email";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "LANDLORD") {
      return NextResponse.json({ success: false, error: "Only landlords can access this" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        bankAccountNumber: true,
        bankCode: true,
        bankName: true,
        bankAccountName: true,
        paystackRecipientCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[BANK ACCOUNT GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "LANDLORD") {
      return NextResponse.json({ success: false, error: "Only landlords can save bank accounts" }, { status: 403 });
    }

    const body = await request.json();
    const { accountNumber, bankCode, bankName, accountName } = body;

    if (!accountNumber || !bankCode || !bankName || !accountName) {
      return NextResponse.json(
        { success: false, error: "accountNumber, bankCode, bankName, and accountName are required" },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json({ success: false, error: "Account number must be 10 digits" }, { status: 400 });
    }

    const landlord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, paystackRecipientCode: true },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Create or update the Paystack transfer recipient
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      }),
    });

    const recipientData = await recipientRes.json();

    if (!recipientData.status) {
      console.error("[BANK ACCOUNT RECIPIENT ERROR]", recipientData);
      return NextResponse.json(
        { success: false, error: recipientData.message || "Failed to create transfer recipient" },
        { status: 400 }
      );
    }

    const recipientCode = recipientData.data.recipient_code;

    // V12 fix: save + stamp bankChangeAt (kicks off 24h payout quarantine)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        bankAccountNumber: accountNumber,
        bankCode,
        bankName,
        bankAccountName: accountName,
        paystackRecipientCode: recipientCode,
        bankChangeAt: new Date(),
      },
    });

    // V12 fix: notify the landlord out-of-band so a hijacked session leaves
    // an inbox trail. Fire-and-forget — don't block the response on email.
    const masked = `•••• •••• ${accountNumber.slice(-4)}`;
    sendBankAccountChangedEmail({
      to: landlord.email,
      name: landlord.name,
      bankName,
      maskedAccountNumber: masked,
    }).catch((err) => console.error("[bank-account] change-notification email failed:", err));

    return NextResponse.json({
      success: true,
      message: "Bank account saved. Payouts will resume in 24 hours.",
      data: { accountName, bankName, accountNumber },
    });
  } catch (error) {
    console.error("[BANK ACCOUNT POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
