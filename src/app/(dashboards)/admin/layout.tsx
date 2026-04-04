"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Building2, Users, BookOpen,
  ShieldCheck, LogOut, ChevronRight,
} from "lucide-react";

const NAV = [
  { href: "/admin",            label: "Overview",      icon: LayoutDashboard },
  { href: "/admin/properties", label: "Properties",    icon: Building2 },
  { href: "/admin/users",      label: "Users",         icon: Users },
  { href: "/admin/bookings",   label: "Bookings",      icon: BookOpen },
  { href: "/admin/landlords",  label: "Verifications", icon: ShieldCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // Override the parent layout's padding/max-width by breaking out with negative margin
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 flex min-h-screen">
      {/* Dark sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0F172A]">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">RentalHub NG</p>
          <p className="text-white font-bold text-base mt-0.5">Admin Panel</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-5 px-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-40" />}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-2 py-4 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 bg-slate-100 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
