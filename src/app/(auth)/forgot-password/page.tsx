"use client";

import Link from "next/link";
import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [state, setState]     = useState<State>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage(data.error ?? "Something went wrong. Please try again.");
        setState("error");
      } else {
        setMessage(data.message);
        setState("success");
      }
    } catch {
      setMessage("Could not connect to the server. Please try again.");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#192F59]">Forgot Password</h1>
        <p className="text-gray-600 mt-2 text-sm">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {state === "success" ? (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{message}</p>
            <p className="mt-2 text-xs text-gray-500">
              Check your inbox (and spam folder). The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {state === "error" && message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{message}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={state === "loading"}
              className="w-full bg-[#E67E22] hover:bg-[#D35400] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {state === "loading" ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="mt-6">
          <Link href="/login" className="text-sm text-gray-700 hover:text-[#E67E22] transition-colors">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
