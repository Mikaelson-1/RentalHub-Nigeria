import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function getAuthenticatedSession(
  requiredRole?: UserRole
): Promise<{
  session: Session | null;
  error: string | null;
  status: number | null;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      session: null,
      error: "Authentication required.",
      status: 401,
    };
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return {
      session: null,
      error: "Unauthorized.",
      status: 403,
    };
  }

  return {
    session,
    error: null,
    status: null,
  };
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export async function withAuth<T>(
  handler: (session: Session) => Promise<NextResponse | Response>,
  requiredRole?: UserRole
): Promise<NextResponse | Response> {
  const { session, error, status } = await getAuthenticatedSession(requiredRole);

  if (error) {
    return apiError(error, status!);
  }

  return await handler(session!);
}
