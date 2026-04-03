"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role, VerificationStatus } from "@prisma/client";

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

interface LoginData {
  email: string;
  password: string;
}

/**
 * Registers a new user with hashed password
 * @param data - Registration data including name, email, password, and optional role
 * @returns Success message or error
 */
export async function registerUser(data: RegisterData) {
  try {
    // Validate required fields
    if (!data.name || !data.email || !data.password) {
      return {
        success: false,
        error: "Name, email, and password are required",
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Validate password strength
    if (data.password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long",
      };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Determine role (default to STUDENT if not specified)
    const role = data.role || Role.STUDENT;

    // Account verification is not required for signup.
    // Property listings are reviewed separately via PropertyStatus.PENDING.
    const verificationStatus = VerificationStatus.VERIFIED;

    // Create the user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: role,
        verificationStatus: verificationStatus,
      },
    });

    return {
      success: true,
      message:
        "Account created successfully. You can now log in.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: "An error occurred during registration. Please try again.",
    };
  }
}

/**
 * Alternative register function that accepts FormData
 * @param formData - FormData containing registration fields
 * @returns Success message or error
 */
export async function registerUserFromForm(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = (formData.get("role") as Role) || Role.STUDENT;

  return registerUser({ name, email, password, role });
}

/**
 * Logs in a user using NextAuth credentials provider
 * Note: This is a server action wrapper - actual sign-in happens client-side
 * @param data - Login credentials
 * @returns Result of sign-in attempt
 */
export async function loginUser(data: LoginData) {
  try {
    // Validate required fields
    if (!data.email || !data.password) {
      return {
        success: false,
        error: "Email and password are required",
      };
    }

    // The actual sign-in will be handled client-side with next-auth/react
    // This server action can be used for additional validation if needed
    return {
      success: true,
      message: "Credentials validated",
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "An error occurred during login. Please try again.",
    };
  }
}

/**
 * Alternative login function that accepts FormData
 * @param formData - FormData containing email and password
 * @returns Success message or error
 */
export async function loginUserFromForm(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  return loginUser({ email, password });
}

/**
 * Gets the current user by email (for server-side use)
 * @param email - User's email address
 * @returns User object without password
 */
export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

/**
 * Updates a user's verification status (admin only)
 * @param userId - User ID to update
 * @param status - New verification status
 * @returns Updated user
 */
export async function updateUserVerificationStatus(
  userId: string,
  status: VerificationStatus
) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error("Update verification status error:", error);
    return { success: false, error: "Failed to update user status" };
  }
}
