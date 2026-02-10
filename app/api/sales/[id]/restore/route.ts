/**
 * Club 19 Sales OS - Restore Deleted Sales Record API
 *
 * POST /api/sales/[id]/restore
 * Restores a soft-deleted sale record by setting deleted_at to null
 *
 * Superadmin only endpoint
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import * as logger from '@/lib/logger';

// Drizzle imports
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from '@/src/xata';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: saleId } = await params;

  logger.info('SALES_RESTORE', 'Restore request received', { saleId });

  try {
    // 1. Auth check - superadmin only
    const { userId } = await auth();
    if (!userId) {
      logger.error('SALES_RESTORE', 'Unauthorized - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole();
    logger.info('SALES_RESTORE', 'User role check', { role });

    if (role !== 'superadmin') {
      logger.error('SALES_RESTORE', 'Forbidden - insufficient role', { role });
      return NextResponse.json(
        { error: 'Forbidden - requires superadmin role' },
        { status: 403 }
      );
    }

    // 2. Check if sale exists (include deleted records)
    // ORIGINAL XATA:
    // const xata = getXataClient();
    // const sale = await xata.db.Sales.filter({ id: saleId }).getFirst();

    // DRIZZLE:
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!sale) {
      logger.error('SALES_RESTORE', 'Sale not found', { saleId });
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // 3. Check if actually deleted
    if (!sale.deletedAt) {
      logger.warn('SALES_RESTORE', 'Sale is not deleted', { saleId });
      return NextResponse.json(
        { error: 'Sale is not deleted' },
        { status: 400 }
      );
    }

    // 4. Restore - set deleted_at to null
    // ORIGINAL XATA:
    // await xata.db.Sales.update(saleId, {
    //   deleted_at: null,
    // });

    // DRIZZLE:
    await db
      .update(sales)
      .set({ deletedAt: null })
      .where(eq(sales.id, saleId));

    logger.info('SALES_RESTORE', 'Sale restored successfully', { saleId });

    return NextResponse.json({
      success: true,
      message: 'Sale restored successfully',
      saleId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SALES_RESTORE', 'Failed to restore sale', { saleId, error: error as any });
    return NextResponse.json(
      {
        error: 'Failed to restore sale',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
