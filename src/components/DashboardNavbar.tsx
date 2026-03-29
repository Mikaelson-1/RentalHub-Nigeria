"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Search, MessageSquare, Bell, HelpCircle, Plus, LogOut } from "lucide-react";

export default function DashboardNavbar() {
  const { data: session } = useSession();

  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || "U";
  const userName = session?.user?.name || "User";
  const userRole = session?.user?.role?.toLowerCase() || "user";

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left Side */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/logo.png"
              alt="RentalHub NG"
              width={180}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          {/* Global Search Bar - Center */}
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 w-full max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties or tenants..."
                className="w-full bg-gray-100 rounded-full py-2.5 pl-11 pr-4 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Right Side - Actions & Profile */}
          <div className="flex items-center gap-3">
            {/* Add Listing Button */}
            <Link
              href="/landlord/add-property"
              className="hidden sm:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Listing</span>
            </Link>

            {/* Action Icons */}
            <div className="flex items-center gap-1">
              <button className="p-2 text-gray-600 hover:text-orange-500 transition-colors rounded-full hover:bg-gray-100">
                <MessageSquare className="w-5 h-5" />
              </button>
              
              {/* Bell with notification badge */}
              <button className="relative p-2 text-gray-600 hover:text-orange-500 transition-colors rounded-full hover:bg-gray-100">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full"></span>
              </button>
              
              <button className="p-2 text-gray-600 hover:text-orange-500 transition-colors rounded-full hover:bg-gray-100">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
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
              
              {/* Logout Button */}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
