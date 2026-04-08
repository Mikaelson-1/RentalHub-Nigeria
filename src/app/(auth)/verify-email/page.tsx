"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();

  const initialEmail = useMemo(() => params.get("email") ?? "", [params]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to verify OTP.");
      }
      setSuccess(payload.message || "Email verified successfully.");
      setTimeout(() => router.push("/login"), 1800);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const response = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to resend OTP.");
      }
      setSuccess(payload.message || "OTP sent.");
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-[#192F59]">Verify Your Email</h1>
        <p className="text-gray-600 mt-2 text-sm">
          Enter the 6-digit OTP sent to your email address.
        </p>

        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="otp">
              OTP Code
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg tracking-[0.4em] text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E67E22] hover:bg-[#D35400] disabled:opacity-50 text-white font-semibold py-3 rounded-lg"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <button
            type="button"
            onClick={() => void onResend()}
            disabled={resending}
            className="w-full border border-[#192F59] text-[#192F59] hover:bg-gray-50 disabled:opacity-50 font-semibold py-3 rounded-lg"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600 text-center">
          Back to{" "}
          <Link href="/login" className="text-[#E67E22] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md">
            <p className="text-sm text-gray-600">Loading verification form...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
