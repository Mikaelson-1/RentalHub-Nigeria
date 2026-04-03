/**
 * GET  /api/properties       — List/search properties
 * POST /api/properties       — Create a property (landlords only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import type { PropertyStatus } from '@prisma/client';
import { sanitizeText, sanitizeStringArray } from '@/lib/sanitize';
import { logger } from '@/lib/logger';

const SCHOOL_LOCATION_KEYWORDS: Record<string, string[]> = {
  'BOUESTI - Ikere-Ekiti': ['Ikere', 'Uro', 'Odo Oja', 'Afao', 'Olumilua', 'Ajebandele', 'Ikoyi Estate', 'Amoye', "Oke 'Kere"],
  'University of Lagos (UNILAG)': ['Akoka', 'Yaba', 'Bariga', 'Surulere'],
  'Obafemi Awolowo University (OAU)': ['Ile-Ife', 'Modakeke'],
  'University of Ibadan (UI)': ['Ibadan', 'Bodija', 'Agbowo', 'Sango'],
  'University of Benin (UNIBEN)': ['Benin', 'Ugbowo', 'Ekosodin'],
  'Federal University of Technology Akure (FUTA)': ['Akure', 'Oba-Ile', 'Aule'],
  'University of Ilorin (UNILORIN)': ['Ilorin', 'Tanke', 'Oke-Odo'],
  'Ahmadu Bello University (ABU)': ['Zaria', 'Samaru', 'Kongo'],
  'University of Nigeria Nsukka (UNN)': ['Nsukka', 'Odenigwe'],
  'Covenant University': ['Ota', 'Canaanland', 'Iyana-Iyesi'],
};

// ── GET — Browse approved properties ─────────────────────

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "true";
    const isLandlordMineView = mine && session?.user?.role === "LANDLORD";

    const location  = searchParams.get('location') ?? undefined;
    const school = searchParams.get('school') ?? undefined;
    const activeFilter = school?.trim() || location?.trim() || undefined;
    const locationNameFilters = activeFilter
      ? (school ? SCHOOL_LOCATION_KEYWORDS[school] ?? [school] : [location ?? ''])
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : [];
    const requestedStatus = searchParams.get('status') as PropertyStatus | null;
    const allowedStatuses: PropertyStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
    const isAdmin = session?.user?.role === 'ADMIN';
    const status =
      isLandlordMineView
        ? requestedStatus && allowedStatuses.includes(requestedStatus)
          ? requestedStatus
          : undefined
        : isAdmin && requestedStatus && allowedStatuses.includes(requestedStatus)
        ? requestedStatus
        : 'APPROVED';
    const minPrice  = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice  = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const page      = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize  = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '12')));
    const sortBy    = (searchParams.get('sortBy') ?? 'createdAt') as 'price' | 'createdAt' | 'distanceToCampus';
    const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

    const where = {
      ...(status && { status }),
      ...(isLandlordMineView && { landlordId: session?.user?.id }),
      ...(activeFilter && {
        location: {
          OR: locationNameFilters.map((keyword) => ({
            name: { contains: keyword, mode: 'insensitive' as const },
          })),
        },
      }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { price: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
        : {}),
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          landlord: { select: { id: true, name: true, email: true, verificationStatus: true } },
          location: true,
          _count:   { select: { bookings: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items:      properties,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error('[PROPERTIES GET ERROR]', { error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to fetch properties.' }, { status: 500 });
  }
}

// ── POST — Create a property listing ─────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Only landlords can list properties.' }, { status: 403 });
    }

    if (session.user.role === 'LANDLORD' && session.user.verificationStatus === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended. You cannot create new listings.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { title, description, price, locationId, distanceToCampus, amenities = [], images = [] } = body;

    if (!title?.trim() || !description?.trim() || !price || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Title, description, price, and location are required.' },
        { status: 400 },
      );
    }

    const locationExists = await prisma.location.findUnique({ where: { id: locationId } });
    if (!locationExists) {
      return NextResponse.json({ success: false, error: 'Invalid location.' }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        title:            sanitizeText(title, 200),
        description:      sanitizeText(description, 5000),
        price,
        locationId,
        landlordId:       session.user.id,
        distanceToCampus: distanceToCampus ? Number(distanceToCampus) : null,
        amenities:        sanitizeStringArray(amenities),
        images,
        status:           'PENDING',
      },
      include: { location: true },
    });

    return NextResponse.json(
      { success: true, data: property, message: 'Property submitted for admin review.' },
      { status: 201 },
    );
  } catch (error) {
    logger.error('[PROPERTIES POST ERROR]', { error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to create property.' }, { status: 500 });
  }
}
