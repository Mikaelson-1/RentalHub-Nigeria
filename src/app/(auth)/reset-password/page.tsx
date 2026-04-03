"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type State = "idle" | "loading" | "success" | "error";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [state,     setState]     = useState<State>("idle");
  const [message,   setMessage]   = useState("");

  if (!token) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-6">
        <p className="text-red-600 text-sm">
          This reset link is missing or invalid. Please{" "}
          <Link href="/forgot-password" className="underline font-medium">
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      setState("error");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      setState("error");
      return;
    }

    setState("loading");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage(data.error ?? "Something went wrong. Please try again.");
        setState("error");
      } else {
        setState("success");
        setMessage(data.message);
        // Redirect to login after a short delay
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setMessage("Could not connect to the server. Please try again.");
      setState("error");
    }
  };

  return (
    <>
      {state === "success" ? (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm font-medium">{message}</p>
          <p className="text-xs text-gray-500 mt-1">Redirecting you to login…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {state === "error" && message && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{message}</p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full bg-[#E67E22] hover:bg-[#D35400] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {state === "loading" ? "Updating Password…" : "Set New Password"}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#192F59]">Set New Password</h1>
        <p className="text-gray-600 mt-2 text-sm">
          Choose a strong password for your RentalHub account.
        </p>

        <Suspense fallback={<p className="mt-6 text-sm text-gray-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-6">
          <Link href="/login" className="text-sm text-gray-700 hover:text-[#E67E22] transition-colors">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
