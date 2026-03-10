/**
 * Club 19 Sales OS - Single Sale API
 *
 * GET: Fetch single sale by ID
 * PATCH: Update sale fields (especially shopper assignment)
 *
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import { calculateMargins } from '@/lib/economics';
import { roundCurrency } from '@/lib/utils/currency';
import * as logger from '@/lib/logger';

// Drizzle imports
import { db } from "@/db";
import { sales, buyers, shoppers, suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    logger.info('SALES_API', 'Fetching sale', { saleId: id });

    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, id),
      with: {
        buyer: true,
        shopper: true,
        supplier: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    logger.error('SALES_API', 'Error fetching sale', { error: error as any });
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
    logger.info('SALES_API', 'Update sale request', { saleId: id, fields: Object.keys(body) });

// Build update object from allowed fields
    const updateData: Record<string, any> = {};

    // Allow updating shopper and supplier (link fields)
    // Note: In Drizzle, we use the foreign key column names (shopperId, supplierId)
    if (body.shopper !== undefined) {
      updateData.shopperId = body.shopper || null;
    }
    if (body.supplier !== undefined) {
      updateData.supplierId = body.supplier || null;
    }

    // Allow updating other fields if needed
    // Map snake_case API fields to camelCase Drizzle schema fields
    const fieldMappings: Record<string, string> = {
      'brand': 'brand',
      'category': 'category',
      'item_title': 'itemTitle',
      'quantity': 'quantity',
      'buy_price': 'buyPrice',
      'sale_amount_inc_vat': 'saleAmountIncVat',
      'sale_amount_ex_vat': 'saleAmountExVat',
      'gross_margin': 'grossMargin',
      'internal_notes': 'internalNotes',
      'shipping_cost': 'shippingCost',
      'shipping_cost_confirmed': 'shippingCostConfirmed',
      'commissionable_margin': 'commissionableMargin',
    };

    for (const [apiField, schemaField] of Object.entries(fieldMappings)) {
      if (body[apiField] !== undefined) {
        updateData[schemaField] = body[apiField];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Recalculate margins when buy_price or shipping_cost changes
    if (body.buy_price !== undefined || body.shipping_cost !== undefined) {
      const [currentSale] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, id))
        .limit(1);

      if (currentSale) {
        const saleAmountExVat = currentSale.saleAmountExVat || 0;
        const newBuyPrice = body.buy_price !== undefined
          ? roundCurrency(body.buy_price)
          : (currentSale.buyPrice || 0);
        const shippingCost = body.shipping_cost !== undefined
          ? roundCurrency(body.shipping_cost)
          : (currentSale.shippingCost || 0);
        const cardFees = currentSale.cardFees || 0;
        const directCosts = currentSale.directCosts || 0;
        const introducerCommission = currentSale.introducerCommission || 0;

        const marginResult = calculateMargins({
          saleAmountExVat,
          buyPrice: newBuyPrice,
          shippingCost,
          cardFees,
          directCosts,
          introducerCommission,
        });

        if (body.buy_price !== undefined) {
          updateData.buyPrice = newBuyPrice;
        }
        if (body.shipping_cost !== undefined) {
          updateData.shippingCost = shippingCost;
        }
        updateData.grossMargin = marginResult.grossMargin;
        updateData.commissionableMargin = marginResult.commissionableMargin;

        logger.info('SALES_API', 'Recalculated margins', {
          saleId: id,
          saleAmountExVat,
          buyPrice: newBuyPrice,
          shippingCost,
          grossMargin: marginResult.grossMargin,
          commissionableMargin: marginResult.commissionableMargin,
        });
      }
    }

    logger.info('SALES_API', 'Updating sale', { saleId: id, updateFields: Object.keys(updateData) });

    const [updatedSale] = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.id, id))
      .returning();

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
    logger.error('SALES_API', 'Error updating sale', { error: error as any });
    return NextResponse.json(
      { error: 'Failed to update sale' },
      { status: 500 }
    );
  }
}
