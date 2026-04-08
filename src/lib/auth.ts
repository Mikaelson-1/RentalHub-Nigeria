import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { Role, VerificationStatus } from "@prisma/client";
import { rateLimit } from "./rate-limit";

// Extend the NextAuth types to include role and id
declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    verificationStatus: VerificationStatus;
    avatarUrl?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      verificationStatus: VerificationStatus;
      avatarUrl?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    verificationStatus: VerificationStatus;
    avatarUrl?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Rate limit: 10 login attempts per email per 15 minutes
        const rl = rateLimit(`login:${credentials.email.toLowerCase()}`, { limit: 10, windowSeconds: 900 });
        if (!rl.success) {
          throw new Error(`Too many login attempts. Please try again in ${rl.retryAfter} seconds.`);
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Check if user is verified
        if (user.verificationStatus === VerificationStatus.SUSPENDED) {
          throw new Error("Account has been suspended");
        }
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Return user object
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
          avatarUrl: user.avatarUrl ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.verificationStatus = user.verificationStatus;
        token.avatarUrl = user.avatarUrl ?? null;
      }
      // Handle explicit session updates (e.g. after avatar or profile save)
      if (trigger === "update" && sessionUpdate) {
        if (sessionUpdate.avatarUrl !== undefined) token.avatarUrl = sessionUpdate.avatarUrl;
        if (sessionUpdate.verificationStatus) token.verificationStatus = sessionUpdate.verificationStatus;
        if (sessionUpdate.name) token.name = sessionUpdate.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.verificationStatus = token.verificationStatus;
        session.user.avatarUrl = token.avatarUrl ?? null;
      }
      return session;
    },
  },
  events: {},
};
