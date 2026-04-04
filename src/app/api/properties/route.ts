/**
 * GET  /api/properties       — List/search properties
 * POST /api/properties       — Create a property (landlords only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import type { PropertyStatus } from '@prisma/client';
import { SCHOOL_LOCATION_KEYWORDS } from '@/lib/schools';
import gemini from '@/lib/gemini';

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
          landlord:   { select: { id: true, name: true, email: true, verificationStatus: true } },
          ...(isAdmin && { reviewedBy: { select: { id: true, name: true, email: true } } }),
          location:   true,
          _count:     { select: { bookings: true } },
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
    console.error('[PROPERTIES GET ERROR]', error);
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

    const body = await request.json();
    const { title, description, price, locationId, distanceToCampus, amenities = [], images = [], vacantUnits } = body;

    if (!title?.trim() || !description?.trim() || !price || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Title, description, price, and location are required.' },
        { status: 400 },
      );
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one uploaded property image is required.' },
        { status: 400 },
      );
    }

    if (!Array.isArray(amenities)) {
      return NextResponse.json(
        { success: false, error: 'Amenities must be provided as an array.' },
        { status: 400 },
      );
    }

    const locationExists = await prisma.location.findUnique({ where: { id: locationId } });
    if (!locationExists) {
      return NextResponse.json({ success: false, error: 'Invalid location.' }, { status: 400 });
    }

    // AI Scam check — run inline (no HTTP self-call) with a 7s timeout so it never blocks submission
    let aiScamFlag = false;
    let aiScamReason: string | null = null;
    try {
      const scamCheck = async () => {
        const model = gemini.getGenerativeModel({
          model: 'gemini-2.0-flash-lite',
          systemInstruction:
            'You are a fraud detection assistant for a Nigerian student housing platform. Analyze property listing text for scam signals commonly seen in Nigeria advance-fee fraud, particularly targeting students. Check for: urgency pressure ("pay now or lose it", "only today"), requests to pay via WhatsApp or personal bank transfer instead of platform, suspiciously low prices far below market rate for Nigerian student housing, promises that seem too good to be true, requests for advance payment before viewing, threats or emotional manipulation, unrealistic claims (mansion for ₦10k/month). Respond ONLY with valid JSON: { "flagged": boolean, "confidence": "low"|"medium"|"high", "reasons": string[] }. If not flagged, reasons should be empty array.',
        });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `Title: ${title}\nDescription: ${description}` }] }],
          generationConfig: { maxOutputTokens: 300 },
        });
        const raw = result.response.text().replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        return JSON.parse(raw) as { flagged: boolean; confidence: string; reasons: string[] };
      };

      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000));
      const scamResult = await Promise.race([scamCheck(), timeout]);

      if (scamResult) {
        if (scamResult.flagged && scamResult.confidence === 'high') {
          return NextResponse.json(
            { success: false, error: `Your listing was flagged: ${scamResult.reasons.join('; ')}. Please revise.` },
            { status: 400 },
          );
        }
        if (scamResult.flagged) {
          aiScamFlag = true;
          aiScamReason = scamResult.reasons.join('; ');
        }
      }
    } catch { /* don't block listing if AI fails */ }

    const property = await prisma.property.create({
      data: {
        title:            title.trim(),
        description:      description.trim(),
        price,
        locationId,
        landlordId:       session.user.id,
        distanceToCampus: distanceToCampus ? Number(distanceToCampus) : null,
        amenities,
        images,
        status:           'PENDING',
        vacantUnits:      vacantUnits !== undefined ? Number(vacantUnits) : 1,
        aiScamFlag,
        aiScamReason,
      },
      include: { location: true },
    });

    return NextResponse.json(
      { success: true, data: property, message: 'Property submitted for admin review.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('[PROPERTIES POST ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to create property.' }, { status: 500 });
  }
}
