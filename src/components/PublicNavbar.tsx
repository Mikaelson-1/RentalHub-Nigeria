"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Plus, User } from "lucide-react";

const navLinks = [
  { href: "#how-it-works", label: "How it Works" },
];

export default function PublicNavbar() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/logo.png"
              alt="RentalHub NG"
              width={180}
              height={40}
              className="h-9 w-auto"
            />
          </Link>

          {/* Center Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Buttons - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              // Authenticated user
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
              // Guest user
              <>
                <Link
                  href="/register"
                  className="text-sm font-medium text-black border border-black px-4 py-2 rounded-md hover:bg-black hover:text-white transition-colors"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register?role=LANDLORD"
                  className="flex items-center gap-1 text-sm font-semibold bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Listing
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-orange-500 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              {/* Mobile Nav Links */}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-gray-700 hover:text-orange-500 transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Divider */}
              <div className="border-t border-gray-100 my-2" />

              {/* Mobile Auth Buttons */}
              {isAuthenticated ? (
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
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-black border border-black px-4 py-2 rounded-md text-center hover:bg-black hover:text-white transition-colors"
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-gray-700 hover:text-orange-500 transition-colors py-2"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register?role=LANDLORD"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 text-base font-semibold bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Listing
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
