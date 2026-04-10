/**
 * GET  /api/properties       — List/search properties
 * POST /api/properties       — Create a property (landlords only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import type { PropertyStatus, VerificationStatus } from '@prisma/client';
import { SCHOOL_LOCATION_KEYWORDS } from '@/lib/schools';
import gemini from '@/lib/gemini';
import { notifyRole, notifyUser } from '@/lib/notifications';
import { sanitizeHttpUrlArray, sanitizeStringArray, sanitizeText } from '@/lib/sanitize';

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

    // Enforce listing gate: landlords must be verified before listing
    if (session.user.role === "LANDLORD") {
      const landlord = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { verificationStatus: true },
      });

      const status = landlord?.verificationStatus as VerificationStatus | undefined;
      if (!status || status !== "VERIFIED") {
        const statusMessage: Record<Exclude<VerificationStatus, "VERIFIED">, string> = {
          UNVERIFIED: "Complete your landlord verification before listing properties.",
          UNDER_REVIEW: "Your verification documents are under review. You can list properties after approval.",
          REJECTED: "Your verification was rejected. Please resubmit documents before listing properties.",
          SUSPENDED: "Your account is suspended and cannot create listings.",
        };

        return NextResponse.json(
          {
            success: false,
            error: statusMessage[status as Exclude<VerificationStatus, "VERIFIED">] ?? "Your account is not eligible to create listings yet.",
          },
          { status: 403 },
        );
      }
    }

    const body = await request.json();
    const { title, description, price, locationId, locationName, distanceToCampus, amenities = [], images = [], vacantUnits } = body;

    if (!title?.trim() || !description?.trim() || !price || (!locationId && !locationName?.trim())) {
      return NextResponse.json(
        { success: false, error: 'Title, description, price, and environment/area are required.' },
        { status: 400 },
      );
    }

    const safeImages = sanitizeHttpUrlArray(images);
    if (safeImages.length === 0) {
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

    const safeTitle = sanitizeText(title, 200);
    const safeDescription = sanitizeText(description, 5000);
    const safeAmenities = sanitizeStringArray(amenities);
    const parsedPrice = Number(price);
    const parsedDistance = distanceToCampus ? Number(distanceToCampus) : null;
    const parsedVacantUnits = vacantUnits !== undefined ? Number(vacantUnits) : 1;

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ success: false, error: "Price must be a valid number greater than 0." }, { status: 400 });
    }
    if (parsedDistance !== null && (!Number.isFinite(parsedDistance) || parsedDistance < 0)) {
      return NextResponse.json({ success: false, error: "Distance to campus must be a valid number." }, { status: 400 });
    }
    if (!Number.isInteger(parsedVacantUnits) || parsedVacantUnits < 1) {
      return NextResponse.json({ success: false, error: "Vacant units must be at least 1." }, { status: 400 });
    }

    let resolvedLocationId: string;
    if (locationId) {
      const locationExists = await prisma.location.findUnique({ where: { id: locationId } });
      if (!locationExists) {
        return NextResponse.json({ success: false, error: 'Invalid location.' }, { status: 400 });
      }
      resolvedLocationId = locationExists.id;
    } else {
      const normalizedLocationName = sanitizeText(String(locationName), 120);
      const location = await prisma.location.upsert({
        where: { name: normalizedLocationName },
        update: {},
        create: {
          name: normalizedLocationName,
          classification: "Neighbourhood",
        },
        select: { id: true },
      });
      resolvedLocationId = location.id;
    }

    // AI Scam check — run inline (no HTTP self-call) with a 7s timeout so it never blocks submission
    let aiScamFlag = false;
    let aiScamReason: string | null = null;
    try {
      const scamCheck = async () => {
        const model = gemini.getGenerativeModel({
          model: 'gemini-2.0-flash-lite',
          systemInstruction:
            'You are a fraud detection assistant for a student housing platform. Analyze property listing text for scam signals, particularly advance-fee fraud targeting students. Check for: urgency pressure ("pay now or lose it", "only today"), requests to pay via WhatsApp or personal bank transfer instead of platform, suspiciously low prices far below market rate for student housing, promises that seem too good to be true, requests for advance payment before viewing, threats or emotional manipulation, unrealistic claims (mansion for ₦10k/month). Respond ONLY with valid JSON: { "flagged": boolean, "confidence": "low"|"medium"|"high", "reasons": string[] }. If not flagged, reasons should be empty array.',
        });
        const result = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: `Title: ${safeTitle}\nDescription: ${safeDescription}` }] }],
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
        title:            safeTitle,
        description:      safeDescription,
        price:            parsedPrice,
        locationId:       resolvedLocationId,
        landlordId:       session.user.id,
        distanceToCampus: parsedDistance,
        amenities:        safeAmenities,
        images:           safeImages,
        status:           'PENDING',
        vacantUnits:      parsedVacantUnits,
        aiScamFlag,
        aiScamReason,
      },
      include: { location: true },
    });

    await Promise.all([
      notifyUser({
        userId: session.user.id,
        type: "PROPERTY",
        title: "Listing submitted",
        message: `${property.title} was submitted and is pending admin review.`,
        link: "/landlord",
      }),
      notifyRole(
        "ADMIN",
        "New listing pending review",
        `${property.title} in ${property.location.name} was submitted by a landlord.`,
        "PROPERTY",
        "/admin",
      ),
    ]);

    return NextResponse.json(
      { success: true, data: property, message: 'Property submitted for admin review.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('[PROPERTIES POST ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to create property.' }, { status: 500 });
  }
}
