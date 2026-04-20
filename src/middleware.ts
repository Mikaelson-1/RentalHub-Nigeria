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

// Landlord pages that are accessible even when UNVERIFIED
const LANDLORD_UNVERIFIED_ALLOWED = [
  "/landlord/verification",
  "/landlord/profile",
];

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

  // New Google OAuth users must pick a role before accessing any dashboard
  if (token.needsRoleSetup) {
    return NextResponse.redirect(new URL("/setup-role", request.url));
  }

  const userRole = token.role as string;
  const verificationStatus = token.verificationStatus as string | undefined;

  // V10 fix: block SUSPENDED users. JWT refreshes every 5 min (see auth.ts),
  // so suspension takes effect within ~5 min of the admin action.
  if (verificationStatus === "SUSPENDED") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "AccountSuspended");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    return response;
  }

  // Check if user has access to the requested route
  for (const [route, allowedRoles] of Object.entries(routeAccessRules)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  // Gate: UNVERIFIED landlords must complete verification before accessing the dashboard
  const isUnverifiedLandlord =
    userRole === "LANDLORD" && verificationStatus === "UNVERIFIED";
  const isOnAllowedUnverifiedPage = LANDLORD_UNVERIFIED_ALLOWED.some((p) =>
    pathname.startsWith(p)
  );

  if (isUnverifiedLandlord && !isOnAllowedUnverifiedPage) {
    return NextResponse.redirect(new URL("/landlord/verification", request.url));
  }

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
