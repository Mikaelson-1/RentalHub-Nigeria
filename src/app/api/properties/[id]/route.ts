/**
 * GET /api/properties/[id]  — Fetch a single property
 * PUT /api/properties/[id]  — Update a property (landlord owner or admin only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { sanitizeText, sanitizeStringArray } from '@/lib/sanitize';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        location: true,
        _count:   { select: { bookings: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: property });
  } catch (error) {
    console.error('[PROPERTY GET ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch property.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    // Fetch existing property to verify ownership
    const existing = await prisma.property.findUnique({
      where: { id },
      select: { landlordId: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
    }

    const isOwner = session.user.role === 'LANDLORD' && existing.landlordId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'You are not authorised to edit this property.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, price, locationId, distanceToCampus, amenities } = body;

    if (!title?.trim() || !description?.trim() || !price) {
      return NextResponse.json(
        { success: false, error: 'Title, description, and price are required.' },
        { status: 400 },
      );
    }

    if (locationId) {
      const locationExists = await prisma.location.findUnique({ where: { id: locationId } });
      if (!locationExists) {
        return NextResponse.json({ success: false, error: 'Invalid location.' }, { status: 400 });
      }
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        title:            sanitizeText(title, 200),
        description:      sanitizeText(description, 5000),
        price,
        ...(locationId && { locationId }),
        distanceToCampus: distanceToCampus ? Number(distanceToCampus) : null,
        ...(amenities && { amenities: sanitizeStringArray(amenities) }),
        // Editing resets to PENDING so admin re-reviews the updated listing
        status: 'PENDING',
        rejectionReason: null,
      },
      include: { location: true },
    });

    return NextResponse.json({
      success: true,
      data:    updated,
      message: 'Property updated and resubmitted for admin review.',
    });
  } catch (error) {
    console.error('[PROPERTY PUT ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to update property.' }, { status: 500 });
  }
}
