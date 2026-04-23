/**
 * GET /api/paystack/banks
 * Returns the list of supported banks from Paystack.
 * Cached for 1 hour since the list rarely changes.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    // V23 fix: require auth. This endpoint proxies Paystack's bank list and
    // was previously fully public — any visitor could scrape it or burn the
    // Paystack API quota. Only landlords need it (for bank-account setup).
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    // Defense-in-depth rate limit even though Next.js revalidate caches for 1h.
    const rl = await rateLimit(`paystack-banks:${session.user.id}`, { limit: 20, windowSeconds: 3600 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

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
