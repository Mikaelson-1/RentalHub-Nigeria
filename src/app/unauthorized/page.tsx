import Link from "next/link";
import type { Metadata } from "next";
import { ShieldX } from "lucide-react";

export const metadata: Metadata = { title: "Access Denied | RentalHub NG" };

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm mb-8">
          You don&apos;t have permission to view this page. If you think this is a mistake, make sure you&apos;re signed in with the correct account.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full bg-[#192F59] hover:bg-blue-900 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Sign in with a different account
          </Link>
          <Link
            href="/"
            className="w-full border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
