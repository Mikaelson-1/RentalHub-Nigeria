/**
 * PATCH /api/properties/[id]/status
 *
 * Admin-only: approve or reject a property listing.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { sendPropertyApprovedToLandlord, sendPropertyRejectedToLandlord } from '@/lib/email';
import type { PropertyStatus } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { status, reason }: { status: PropertyStatus; reason?: string } = body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status value.' }, { status: 400 });
    }

    if (status === "REJECTED" && !reason?.trim()) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required when rejecting a listing." },
        { status: 400 },
      );
    }

    const property = await prisma.property.update({
      where: { id },
      data:  {
        status,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNote: reason?.trim() || null,
      },
      include: {
        landlord: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
        location: true,
      },
    });

    // Notify the landlord of the review outcome (fire-and-forget)
    if (status === 'APPROVED') {
      sendPropertyApprovedToLandlord({
        landlordEmail: property.landlord.email,
        landlordName:  property.landlord.name,
        propertyTitle: property.title,
        propertyId:    property.id,
      }).catch((err) => console.error('[email] property approved notification failed:', err));
    } else if (status === 'REJECTED') {
      sendPropertyRejectedToLandlord({
        landlordEmail: property.landlord.email,
        landlordName:  property.landlord.name,
        propertyTitle: property.title,
        reviewNote:    reason?.trim() ?? '',
      }).catch((err) => console.error('[email] property rejected notification failed:', err));
    }

    return NextResponse.json({
      success: true,
      data:    property,
      message: `Property ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.error('[PROPERTY STATUS PATCH ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to update property status.' }, { status: 500 });
  }
}
