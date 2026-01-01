/**
 * Club 19 Sales OS - Single Sale API
 *
 * GET: Fetch single sale by ID
 * PATCH: Update sale fields (especially shopper assignment)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import { getXataClient } from '@/src/xata';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sales/[id]
 * Fetch a single sale by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    console.log(`[GET /api/sales/${id}] Fetching sale`);

    const xata = getXataClient();
    const sale = await xata.db.Sales
      .select(['*', 'buyer.*', 'shopper.*', 'supplier.*'])
      .filter({ id })
      .getFirst();

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('[GET /api/sales/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sales/[id]
 * Update sale fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole();
    if (!['superadmin', 'operations', 'founder', 'admin'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - requires admin or higher role' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    console.log(`[PATCH /api/sales/${id}] Update request:`, body);

    const xata = getXataClient();

    // Build update object from allowed fields
    const updateData: Record<string, any> = {};

    // Allow updating shopper
    if (body.shopper !== undefined) {
      updateData.shopper = body.shopper;
    }

    // Allow updating other fields if needed
    const allowedFields = [
      'brand',
      'category',
      'item_title',
      'quantity',
      'buy_price',
      'sale_amount_inc_vat',
      'sale_amount_ex_vat',
      'gross_margin',
      'internal_notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    console.log(`[PATCH /api/sales/${id}] Updating with:`, updateData);

    const updatedSale = await xata.db.Sales.update(id, updateData);

    if (!updatedSale) {
      return NextResponse.json(
        { error: 'Failed to update sale' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sale: updatedSale,
    });
  } catch (error) {
    console.error('[PATCH /api/sales/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update sale' },
      { status: 500 }
    );
  }
}
