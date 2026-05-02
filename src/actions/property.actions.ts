"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, PropertyStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updatePropertyStatus(
  propertyId: string,
  status: "APPROVED" | "REJECTED",
  reviewedById?: string,
  reviewNote?: string
) {
  try {
    if (!propertyId || !status) {
      throw new Error("Property ID and status are required");
    }

    if (status === "REJECTED" && !reviewNote?.trim()) {
      throw new Error("A rejection reason is required when rejecting a listing");
    }

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        status: status === "APPROVED" ? PropertyStatus.APPROVED : PropertyStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: reviewedById ?? null,
        reviewNote: reviewNote?.trim() ?? null,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            classification: true,
          },
        },
        landlord: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/properties");
    revalidatePath("/admin");
    revalidatePath("/landlord");

    return { success: true, property };
  } catch (error) {
    console.error("Error updating property status:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update property status"
    );
  }
}
