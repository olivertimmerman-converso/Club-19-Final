/**
 * Club 19 Sales OS - Backfill Source Field API
 *
 * POST /api/backfill-source
 * One-time endpoint to backfill the source field for existing sales with source: null
 * Sets source: 'atelier' for all sales that don't have source set
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import * as logger from '@/lib/logger';

// Drizzle imports
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from '@/src/xata';

export async function POST() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify superadmin role
    const role = await getUserRole();
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden: Superadmin access required' },
        { status: 403 }
      );
    }

    // ORIGINAL XATA:
    // const xata = getXataClient();
    // const salesWithNullSource = await xata.db.Sales
    //   .filter({ source: null })
    //   .select(['id', 'sale_reference', 'xero_invoice_number'])
    //   .getAll();

    // DRIZZLE:
    const salesWithNullSource = await db
      .select({
        id: sales.id,
        saleReference: sales.saleReference,
        xeroInvoiceNumber: sales.xeroInvoiceNumber,
      })
      .from(sales)
      .where(isNull(sales.source));

    logger.info('BACKFILL_SOURCE', 'Found sales with null source', {
      count: salesWithNullSource.length
    });

    // ORIGINAL XATA:
    // const updates = [];
    // for (const sale of salesWithNullSource) {
    //   updates.push(
    //     xata.db.Sales.update(sale.id, { source: 'atelier' })
    //   );
    // }
    // await Promise.all(updates);

    // DRIZZLE:
    // Update all sales with null source to 'atelier' in a single query
    if (salesWithNullSource.length > 0) {
      await db
        .update(sales)
        .set({ source: 'atelier' })
        .where(isNull(sales.source));
    }

    logger.info('BACKFILL_SOURCE', 'Backfill complete', {
      updatedCount: salesWithNullSource.length,
      sampleInvoices: salesWithNullSource.slice(0, 5).map(s => s.xeroInvoiceNumber || s.saleReference)
    });

    return NextResponse.json({
      success: true,
      message: 'Source field backfilled successfully',
      updatedCount: salesWithNullSource.length,
      updatedSales: salesWithNullSource.map(s => ({
        id: s.id,
        reference: s.saleReference || s.xeroInvoiceNumber || 'Unknown'
      }))
    });
  } catch (error) {
    logger.error('BACKFILL_SOURCE', 'Error backfilling source field', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        error: 'Failed to backfill source field',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
