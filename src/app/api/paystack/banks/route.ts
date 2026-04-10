/**
 * GET /api/paystack/banks
 * Returns the list of supported banks from Paystack.
 * Cached for 1 hour since the list rarely changes.
 */
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.paystack.co/bank?currency=NGN&type=nuban&perPage=100",
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        next: { revalidate: 3600 },
      }
    );

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json({ success: false, error: "Failed to fetch banks" }, { status: 500 });
    }

    return NextResponse.json({ success: true, banks: data.data });
  } catch (error) {
    console.error("[PAYSTACK BANKS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
