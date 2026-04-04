"use client";

import { usePathname } from "next/navigation";
import DashboardNavbar from "@/components/DashboardNavbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    // Admin has its own full-screen layout — no navbar wrapper needed
    return <>{children}</>;
  }

  return (
    <>
      <DashboardNavbar />
      <main className="flex-grow bg-gray-50 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </>
  );
}
