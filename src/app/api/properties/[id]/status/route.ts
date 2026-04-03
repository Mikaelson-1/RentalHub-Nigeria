/**
 * PATCH /api/properties/[id]/status
 *
 * Admin-only: approve or reject a property listing.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
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
    const { status, rejectionReason }: { status: PropertyStatus; rejectionReason?: string } = body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status value.' }, { status: 400 });
    }

    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'A rejection reason is required when rejecting a listing.' },
        { status: 400 },
      );
    }

    const property = await prisma.property.update({
      where: { id },
      data:  {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason!.trim() : null,
      },
      include: { landlord: { select: { name: true, email: true } }, location: true },
    });

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
