"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PropertyStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Type for property with relations
export interface PropertyWithRelations {
  id: string;
  title: string;
  description: string;
  price: number | Prisma.Decimal;
  distanceToCampus: number | Prisma.Decimal | null;
  amenities: Prisma.JsonValue;
  images: Prisma.JsonValue;
  status: PropertyStatus;
  createdAt: Date;
  updatedAt: Date;
  landlordId: string;
  locationId: string;
  location: {
    id: string;
    name: string;
    classification: string;
  };
  landlord: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Fetches all approved properties, optionally filtered by location
 * @param locationId - Optional location ID to filter by
 * @returns Array of approved properties with location and landlord data
 */
export async function getApprovedProperties(
  locationId?: string
): Promise<PropertyWithRelations[]> {
  try {
    const properties = await prisma.property.findMany({
      where: {
        status: PropertyStatus.APPROVED,
        ...(locationId && { locationId }),
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return properties;
  } catch (error) {
    console.error("Error fetching approved properties:", error);
    throw new Error("Failed to fetch properties");
  }
}

/**
 * Creates a new property listing (defaults to PENDING status)
 * @param formData - Form data containing property details
 * @param landlordId - ID of the landlord creating the property
 * @returns The created property
 */
export async function createProperty(
  formData: FormData,
  landlordId: string
) {
  try {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const distanceToCampus = formData.get("distanceToCampus")
      ? parseFloat(formData.get("distanceToCampus") as string)
      : null;
    const locationId = formData.get("locationId") as string;
    const amenitiesJson = formData.get("amenities") as string;
    const imagesJson = formData.get("images") as string;

    // Validate required fields
    if (!title || !description || !price || !locationId) {
      throw new Error("Missing required fields");
    }

    // Parse amenities and images
    const amenities = amenitiesJson ? JSON.parse(amenitiesJson) : [];
    const images = imagesJson ? JSON.parse(imagesJson) : [];

    const property = await prisma.property.create({
      data: {
        title,
        description,
        price,
        distanceToCampus,
        amenities,
        images,
        status: PropertyStatus.PENDING, // Default to PENDING for admin approval
        landlordId,
        locationId,
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

    // Revalidate the landing page to show new properties after approval
    revalidatePath("/");
    revalidatePath("/properties");

    return { success: true, property };
  } catch (error) {
    console.error("Error creating property:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to create property"
    );
  }
}

/**
 * Updates the status of a property (for admin verification)
 * @param propertyId - ID of the property to update
 * @param status - New status (APPROVED or REJECTED)
 * @param reviewedById - ID of the admin performing the review
 * @param reviewNote - Optional note explaining the decision (required for REJECTED)
 * @returns The updated property
 */
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

    // Revalidate relevant pages
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

/**
 * Fetches all properties for a specific landlord
 * @param landlordId - ID of the landlord
 * @returns Array of properties belonging to the landlord
 */
export async function getLandlordProperties(landlordId: string) {
  try {
    const properties = await prisma.property.findMany({
      where: { landlordId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            classification: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return properties;
  } catch (error) {
    console.error("Error fetching landlord properties:", error);
    throw new Error("Failed to fetch properties");
  }
}

/**
 * Fetches all pending properties (for admin dashboard)
 * @returns Array of pending properties with location and landlord data
 */
export async function getPendingProperties(): Promise<PropertyWithRelations[]> {
  try {
    const properties = await prisma.property.findMany({
      where: {
        status: PropertyStatus.PENDING,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return properties;
  } catch (error) {
    console.error("Error fetching pending properties:", error);
    throw new Error("Failed to fetch pending properties");
  }
}
