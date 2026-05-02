"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  MessageSquare,
  HelpCircle,
  Plus,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type NavbarVariant = "public" | "authenticated" | "dashboard";

interface NavbarProps {
  variant?: NavbarVariant;
  showSearch?: boolean;
}

const PUBLIC_NAV_LINKS = [
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/properties", label: "Browse" },
  { href: "/#faq", label: "FAQ" },
];

export default function Navbar({ variant = "authenticated", showSearch = true }: NavbarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAuthenticated = status === "authenticated" && Boolean(session?.user?.email);
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || "U";
  const userName = session?.user?.name || "User";
  const userRole = session?.user?.role?.toLowerCase() || "user";
  const avatarUrl = (session?.user as { avatarUrl?: string | null })?.avatarUrl;

  const getDashboardLink = () => {
    if (!session?.user?.role) return "/";
    switch (session.user.role) {
      case "LANDLORD":
        return "/landlord";
      case "STUDENT":
        return "/student";
      case "ADMIN":
        return "/admin";
      default:
        return "/";
    }
  };

  const getProfileLink = () => {
    switch (session?.user?.role) {
      case "LANDLORD":
        return "/landlord/profile";
      case "STUDENT":
        return "/student/profile";
      default:
        return "/admin";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/properties?location=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogoClick = () => {
    if (variant === "dashboard") {
      signOut({ callbackUrl: "/" });
    } else {
      router.push("/");
    }
  };

  const isHomePage = pathname === "/";
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";
  const showDashboardActions = variant === "public" && !isHomePage && !isAuthPage && isAuthenticated;

  return (
    <nav
      className={`sticky top-0 z-50 ${
        variant === "public"
          ? "backdrop-blur-md bg-white/90 border-b border-gray-100"
          : "bg-white border-b border-gray-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between ${
            variant === "dashboard" ? "h-16 sm:h-20" : "h-16"
          }`}
        >
          {/* Logo */}
          {variant === "dashboard" ? (
            <button
              onClick={handleLogoClick}
              className="flex items-center flex-shrink-0 focus:outline-none"
              aria-label="Go to home and sign out"
            >
              <Image
                src="/logo.png"
                alt="RentalHub"
                width={180}
                height={40}
                className={`w-auto ${
                  variant === "dashboard" ? "h-8 sm:h-10" : "h-9"
                }`}
              />
            </button>
          ) : (
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="RentalHub"
                width={180}
                height={40}
                className={`w-auto ${
                  variant === "dashboard" ? "h-8 sm:h-10" : "h-9"
                }`}
              />
            </Link>
          )}

          {/* Public Nav Links (desktop) */}
          {variant === "public" && (
            <div className="hidden md:flex items-center gap-7">
              {PUBLIC_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Search Bar (authenticated & dashboard) */}
          {(variant === "authenticated" || variant === "dashboard") && showSearch && (
            <form
              onSubmit={handleSearch}
              className={`hidden md:flex absolute left-1/2 -translate-x-1/2 ${
                variant === "dashboard" ? "w-full max-w-md" : "w-full max-w-md"
              }`}
            >
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    variant === "dashboard"
                      ? "Search properties by location..."
                      : "Search properties or tenants..."
                  }
                  className={`w-full bg-gray-100 rounded-full py-2.5 pl-11 pr-4 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    variant === "dashboard"
                      ? "focus:ring-orange-500/20"
                      : "focus:ring-[#E67E22]/20"
                  }`}
                />
              </div>
            </form>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {variant === "authenticated" && isAuthenticated ? (
              <>
                {/* Add Listing Button */}
                <button className="hidden sm:flex items-center gap-2 bg-[#E67E22] hover:bg-[#D35400] text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Add Listing</span>
                </button>

                {/* Action Icons */}
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 hover:text-[#E67E22] transition-colors rounded-full hover:bg-gray-100">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <NotificationBell />
                  <button className="p-2 text-gray-600 hover:text-[#E67E22] transition-colors rounded-full hover:bg-gray-100">
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <div className="w-10 h-10 bg-[#E67E22] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {userInitial}
                  </div>
                  <div className="hidden lg:block">
                    <p className="font-sans text-sm font-medium text-gray-900">
                      {userName}
                    </p>
                    <p className="font-sans text-xs text-gray-500 capitalize">
                      {userRole}
                    </p>
                  </div>
                </div>
              </>
            ) : variant === "authenticated" ? (
              <>
                <Link
                  href="/login"
                  className="font-sans text-sm font-medium text-[#192F59] hover:text-[#E67E22] transition-colors"
                >
                  LOGIN
                </Link>
                <Link
                  href="/register?role=LANDLORD"
                  className="font-sans text-xs font-semibold bg-[#E67E22] hover:bg-[#D35400] text-white px-5 py-2.5 rounded-lg transition-colors"
                >
                  LIST PROPERTY
                </Link>
              </>
            ) : variant === "dashboard" ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href={getProfileLink()}
                  className="flex items-center gap-2 sm:gap-3 group"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 bg-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={userName}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <p className="font-sans text-sm font-medium text-gray-900 group-hover:text-[#E67E22] transition-colors">
                      {userName}
                    </p>
                    <p className="font-sans text-xs text-gray-500 capitalize flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {userRole}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ) : variant === "public" ? (
              <div className="hidden md:flex items-center gap-3">
                {status === "loading" ? null : showDashboardActions ? (
                  <>
                    <Link
                      href={getDashboardLink()}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/register"
                      className="text-sm font-medium text-black border border-black px-4 py-2 rounded-md hover:bg-black hover:text-white transition-colors"
                    >
                      Sign Up
                    </Link>
                    <Link
                      href="/register?role=LANDLORD"
                      className="flex items-center gap-1 text-sm font-semibold bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      List Property
                    </Link>
                  </>
                )}
              </div>
            ) : null}

            {/* Mobile Menu Toggle */}
            {(variant === "public" || variant === "authenticated") && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`${variant === "public" ? "md:hidden" : "hidden"} p-2 text-gray-700 hover:text-orange-500 transition-colors`}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {variant === "public" && mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              {PUBLIC_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-gray-700 hover:text-orange-500 transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-gray-100 my-2" />

              {status === "loading" ? null : showDashboardActions ? (
                <>
                  <Link
                    href={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-base font-medium text-gray-700 hover:text-orange-500 transition-colors py-2"
                  >
                    <User className="w-5 h-5" />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: "/" });
                      setMobileMenuOpen(false);
                    }}
                    className="text-left text-base font-medium text-gray-500 hover:text-red-500 transition-colors py-2"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-gray-700 hover:text-orange-500 transition-colors py-2"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-black border border-black px-4 py-2 rounded-md text-center hover:bg-black hover:text-white transition-colors"
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/register?role=LANDLORD"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 text-base font-semibold bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    List Property
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
