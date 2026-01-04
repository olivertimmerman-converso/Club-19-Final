/**
 * Club 19 Sales OS - Introducers API
 *
 * GET /api/introducers
 * Returns list of all introducers for use in Trade Wizard dropdown
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getXataClient } from '@/src/xata';

export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const xata = getXataClient();

    // Fetch all introducers, ordered by name
    const introducers = await xata.db.Introducers
      .select(['id', 'name', 'commission_percent'])
      .sort('name', 'asc')
      .getAll();

    // Transform to friendly format
    const formatted = introducers.map(i => ({
      id: i.id,
      name: i.name || 'Unknown',
      commissionPercent: i.commission_percent || 0,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching introducers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch introducers' },
      { status: 500 }
    );
  }
}
