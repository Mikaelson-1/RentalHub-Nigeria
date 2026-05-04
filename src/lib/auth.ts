import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { Role, VerificationStatus } from "@prisma/client";
import { rateLimit } from "./rate-limit";

// ── NextAuth type extensions ──────────────────────────────────

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    verificationStatus: VerificationStatus;
    avatarUrl?: string | null;
    needsRoleSetup?: boolean; // true for brand-new Google OAuth users
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      verificationStatus: VerificationStatus;
      avatarUrl?: string | null;
      needsRoleSetup?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    verificationStatus: VerificationStatus;
    avatarUrl?: string | null;
    needsRoleSetup?: boolean;
  }
}

// ── Auth config ───────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  // No PrismaAdapter — we handle OAuth user creation manually in the
  // signIn callback so we don't need the adapter's expected schema shape
  // (which conflicts with our custom emailVerified: Boolean field).
  session: {
    strategy: "jwt",
    // V10 fix: reduce idle timeout from 30d → 1d and refresh the JWT every 5
    // minutes. The jwt callback re-reads role/verificationStatus from Postgres
    // on each refresh, so admin suspensions / role changes propagate within
    // ~5 min (for active users) or on next login (for idle users).
    maxAge: 24 * 60 * 60,          // 1 day
    updateAge: 5 * 60,             // refresh JWT every 5 min of activity
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // ── Google OAuth ──────────────────────────────────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email / password ──────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // V11 fix: normalise to match how register stores emails (lowercased).
        // Without this, logging in as "Foo@X.com" fails even though the account exists.
        const normalisedEmail = credentials.email.trim().toLowerCase();

        // Rate limit: 10 attempts per email per 15 minutes
        const rl = await rateLimit(`login:${normalisedEmail}`, {
          limit: 10,
          windowSeconds: 900,
        });
        if (!rl.success) {
          throw new Error(
            `Too many login attempts. Please try again in ${rl.retryAfter} seconds.`,
          );
        }

        const user = await prisma.user.findUnique({
          where: { email: normalisedEmail },
        });

        if (!user) throw new Error("Invalid credentials");

        // Google-only accounts have no password — block credentials login
        if (!user.password) {
          throw new Error("GOOGLE_ACCOUNT_NO_PASSWORD");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );
        if (!isPasswordValid) throw new Error("Invalid credentials");

        if (user.verificationStatus === VerificationStatus.SUSPENDED) {
          throw new Error("Account has been suspended");
        }
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id:                 user.id,
          name:               user.name,
          email:              user.email,
          role:               user.role,
          verificationStatus: user.verificationStatus,
          avatarUrl:          user.avatarUrl ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // ── signIn ────────────────────────────────────────────────
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email;
      if (!email) return false;

      // Find or create our DB user for this Google account
      let dbUser = await prisma.user.findUnique({ where: { email } });
      let isNewUser = false;

      // ── V3 fix: account-takeover via pre-registered unverified credential stub ──
      // If an unverified credential account already exists under this email, it means
      // someone registered it and never proved ownership via OTP. Linking Google to it
      // would give that pre-registrant password-based access to the real owner's account.
      // Require them to complete email verification via the credentials flow first (they
      // can't — they never owned the inbox), effectively forcing manual recovery.
      if (dbUser && dbUser.password && !dbUser.emailVerified) {
        console.error(
          "[auth][signIn] Blocked Google sign-in — unverified credential account exists for email:",
          email,
        );
        // Returning a URL string redirects to error page with the reason
        return "/login?error=UnverifiedAccountExists";
      }

      if (!dbUser) {
        // Brand-new user — default to STUDENT, flag for role setup
        dbUser = await prisma.user.create({
          data: {
            name:               user.name  ?? "User",
            email,
            password:           null,         // no password for OAuth users
            emailVerified:      true,         // Google has already verified the email
            role:               "STUDENT",    // user can change this on setup-role page
            verificationStatus: "UNVERIFIED",
            avatarUrl:          (profile as { picture?: string })?.picture ?? null,
          },
        });
        isNewUser = true;
      }

      // Upsert the OAuth account link so the same Google UID always maps
      // to this user (prevents duplicates if email changes on Google side)
      const existingLink = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider:          account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      });
      if (!existingLink) {
        await prisma.oAuthAccount.create({
          data: {
            userId:            dbUser.id,
            provider:          account.provider,
            providerAccountId: account.providerAccountId,
            accessToken:       account.access_token  ?? null,
            refreshToken:      account.refresh_token ?? null,
            expiresAt:         account.expires_at    ?? null,
          },
        });
      }

      // Attach DB fields onto the NextAuth user object so the JWT
      // callback can pick them up in the `if (user)` branch
      user.id                 = dbUser.id;
      user.role               = dbUser.role;
      user.verificationStatus = dbUser.verificationStatus;
      user.avatarUrl          = dbUser.avatarUrl ?? null;
      user.needsRoleSetup     = isNewUser;

      return true;
    },

    // ── jwt ───────────────────────────────────────────────────
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      // First sign-in (credentials and Google both land here)
      if (user) {
        token.id                 = user.id;
        token.role               = user.role;
        token.verificationStatus = user.verificationStatus;
        token.avatarUrl          = user.avatarUrl ?? null;
        token.needsRoleSetup     = user.needsRoleSetup ?? false;
      }

      // Keep role/verification fresh on subsequent requests, but preserve the transient needsRoleSetup flag
      if (!user && token.id) {
        const needsRoleSetupBackup = token.needsRoleSetup;
        const latest = await prisma.user.findUnique({
          where:  { id: token.id },
          select: {
            role:               true,
            verificationStatus: true,
            avatarUrl:          true,
            name:               true,
          },
        });
        if (latest) {
          token.role               = latest.role;
          token.verificationStatus = latest.verificationStatus;
          token.avatarUrl          = latest.avatarUrl ?? null;
          token.name               = latest.name;
          // Restore needsRoleSetup flag—it's transient and not stored in DB, only cleared via explicit session.update()
          token.needsRoleSetup = needsRoleSetupBackup ?? false;
        }
      }

      // Handle explicit session updates (avatar, role setup, etc.)
      if (trigger === "update" && sessionUpdate) {
        if (sessionUpdate.avatarUrl !== undefined)
          token.avatarUrl = sessionUpdate.avatarUrl;
        if (sessionUpdate.verificationStatus)
          token.verificationStatus = sessionUpdate.verificationStatus;
        if (sessionUpdate.name)
          token.name = sessionUpdate.name;
        // Role-setup completion clears the flag and applies the chosen role
        if (sessionUpdate.needsRoleSetup === false)
          token.needsRoleSetup = false;
        if (sessionUpdate.role)
          token.role = sessionUpdate.role;
      }

      return token;
    },

    // ── session ───────────────────────────────────────────────
    async session({ session, token }) {
      if (token) {
        session.user.id                 = token.id;
        session.user.role               = token.role;
        session.user.verificationStatus = token.verificationStatus;
        session.user.avatarUrl          = token.avatarUrl ?? null;
        session.user.needsRoleSetup     = token.needsRoleSetup ?? false;
      }
      return session;
    },
  },

  events: {},
};
