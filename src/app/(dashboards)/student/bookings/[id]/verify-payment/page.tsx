"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Suspense } from "react";

function VerifyPaymentInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}&bookingId=${encodeURIComponent(id)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("success");
          setMessage("Payment verified successfully! Your apartment is secured.");
          setTimeout(() => router.push("/student?tab=bookings"), 3000);
        } else {
          setStatus("failed");
          setMessage(data.error || "Payment verification failed.");
        }
      } catch {
        setStatus("failed");
        setMessage("An error occurred while verifying your payment.");
      }
    };

    verify();
  }, [reference, id, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-[#192F59] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-navy mb-2">Verifying Payment</h2>
            <p className="text-gray-500 text-sm">Please wait while we confirm your payment with Paystack...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-navy mb-2">Payment Successful!</h2>
            <p className="text-gray-600 text-sm mb-6">{message}</p>
            <p className="text-xs text-gray-400 mb-4">Redirecting to your dashboard in 3 seconds...</p>
            <Link
              href="/student?tab=bookings"
              className="inline-block bg-[#192F59] hover:bg-[#14264a] text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
            >
              Go to My Bookings
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-navy mb-2">Payment Failed</h2>
            <p className="text-gray-600 text-sm mb-6">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/student?tab=bookings"
                className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                My Bookings
              </Link>
              <button
                onClick={() => window.history.back()}
                className="bg-[#192F59] hover:bg-[#14264a] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Loading...</div>}>
      <VerifyPaymentInner />
    </Suspense>
  );
}
