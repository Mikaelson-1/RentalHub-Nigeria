/**
 * GET /api/locations
 *
 * Returns all locations ordered by classification and name.
 * Used to populate dropdowns in the property listing form.
 * Cached for 1 hour since locations rarely change.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOrSet } from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'static:locations';
    const TTL_SECONDS = 60 * 60; // 1 hour

    const locations = await getOrSet(
      cacheKey,
      async () => {
        return await prisma.location.findMany({
          orderBy: [
            { classification: 'asc' },
            { name: 'asc' },
          ],
        });
      },
      TTL_SECONDS
    );

    return NextResponse.json({ success: true, data: locations });
  } catch (error) {
    console.error('[LOCATIONS GET ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations.' },
      { status: 500 },
    );
  }
}
