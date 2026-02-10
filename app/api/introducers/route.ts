/**
 * Club 19 Sales OS - Introducers API
 *
 * GET /api/introducers
 * Returns list of all introducers
 *
 * POST /api/introducers
 * Create new introducer
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as logger from '@/lib/logger';

// Drizzle imports
import { db } from "@/db";
import { introducers } from "@/db/schema";
import { asc } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from '@/src/xata';

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

    // ORIGINAL XATA:
    // const xata = getXataClient();
    // const introducers = await xata.db.Introducers
    //   .select(['id', 'name'])
    //   .sort('name', 'asc')
    //   .getAll();

    // DRIZZLE:
    const introducersList = await db
      .select({
        id: introducers.id,
        name: introducers.name,
      })
      .from(introducers)
      .orderBy(asc(introducers.name));

    // Transform to friendly format
    const formatted = introducersList.map(i => ({
      id: i.id,
      name: i.name || 'Unknown',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error('INTRODUCERS_API', 'Error fetching introducers', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to fetch introducers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // ORIGINAL XATA:
    // const xata = getXataClient();
    // const introducer = await xata.db.Introducers.create({
    //   name: name.trim(),
    // });

    // DRIZZLE:
    const [introducer] = await db
      .insert(introducers)
      .values({
        name: name.trim(),
      })
      .returning();

    logger.info('INTRODUCERS_API', 'New introducer created', {
      introducerId: introducer.id,
      name: introducer.name
    });

    return NextResponse.json({
      id: introducer.id,
      name: introducer.name || 'Unknown',
    }, { status: 201 });
  } catch (error) {
    logger.error('INTRODUCERS_API', 'Error creating introducer', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to create introducer' },
      { status: 500 }
    );
  }
}
