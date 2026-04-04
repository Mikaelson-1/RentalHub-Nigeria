import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Define route access rules by role
const routeAccessRules: Record<string, string[]> = {
  "/student": ["STUDENT"],
  "/landlord": ["LANDLORD"],
  "/admin": ["ADMIN"],
};

// Define protected route prefixes
const protectedPrefixes = ["/student", "/landlord", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // If not a protected route, allow access
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get the JWT token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If no token exists, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user role from token
  const userRole = token.role as string;

  // Check if user has access to the requested route
  for (const [route, allowedRoles] of Object.entries(routeAccessRules)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        // Wrong role — show a clear forbidden page, never silently redirect
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  // User has access, allow the request
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    "/student/:path*",
    "/landlord/:path*",
    "/admin/:path*",
  ],
};
