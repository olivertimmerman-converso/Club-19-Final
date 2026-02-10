/**
 * Club 19 Sales OS - Unlink Invoice API
 *
 * DELETE: Unlink a previously linked Xero invoice from a sale
 * Restores the invoice as an unallocated import
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq, and } from "drizzle-orm";
// ORIGINAL XATA: import { getXataClient } from '@/src/xata';
import {
  calculateMargins,
  getVATRateForBrandingTheme,
  calculateExVatWithRate,
  toNumber,
} from '@/lib/economics';
import { roundCurrency, addCurrency } from '@/lib/utils/currency';
import * as logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface LinkedInvoice {
  xero_invoice_id: string;
  xero_invoice_number: string;
  amount_inc_vat: number;
  currency: string;
  invoice_date: string;
  linked_at: string;
  linked_by: string;
}

/**
 * DELETE /api/sales/[id]/unlink-invoice
 * Unlink a previously linked invoice from this sale
 *
 * Body: { xero_invoice_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can unlink invoices
    const role = await getUserRole();
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - requires superadmin role' },
        { status: 403 }
      );
    }

    const { id: saleId } = await params;
    const body = await request.json();
    const { xero_invoice_id } = body;

    if (!xero_invoice_id) {
      return NextResponse.json(
        { error: 'xero_invoice_id is required' },
        { status: 400 }
      );
    }

    logger.info('UNLINK_INVOICE', 'Unlink invoice request', { saleId, xero_invoice_id });

    // ORIGINAL XATA: const xata = getXataClient();

    // Fetch the sale
    // ORIGINAL XATA: const sale = await xata.db.Sales.read(saleId);
    const saleResults = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);
    const sale = saleResults[0] || null;

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Get existing linked invoices array
    const existingLinked: LinkedInvoice[] = (sale as any).linkedInvoices || [];

    // Find the invoice to unlink
    const invoiceIndex = existingLinked.findIndex(
      inv => inv.xero_invoice_id === xero_invoice_id
    );

    if (invoiceIndex === -1) {
      return NextResponse.json(
        { error: 'Invoice is not linked to this sale' },
        { status: 400 }
      );
    }

    const unlinkedInvoice = existingLinked[invoiceIndex];

    // Remove from array
    const updatedLinked = existingLinked.filter(
      inv => inv.xero_invoice_id !== xero_invoice_id
    );

    // Find the original import record to restore
    // It should be soft-deleted with the same xero_invoice_id
    // ORIGINAL XATA:
    // const originalImport = await xata.db.Sales
    //   .filter({
    //     xero_invoice_id: xero_invoice_id,
    //     source: 'xero_import',
    //   })
    //   .getFirst();
    const originalImportResults = await db
      .select()
      .from(sales)
      .where(and(
        eq(sales.xeroInvoiceId, xero_invoice_id),
        eq(sales.source, 'xero_import')
      ))
      .limit(1);
    const originalImport = originalImportResults[0] || null;

    // Calculate new totals (original sale amount + remaining linked invoices)
    // We need to restore the original primary amount
    // Primary amount = current total - all linked amounts
    const currentTotal = roundCurrency(toNumber(sale.saleAmountIncVat));
    const allLinkedAmounts = existingLinked.reduce(
      (sum, inv) => addCurrency(sum, inv.amount_inc_vat),
      0
    );
    const primaryAmount = roundCurrency(currentTotal - allLinkedAmounts);

    // New linked amounts (after removal)
    const newLinkedAmounts = updatedLinked.reduce(
      (sum, inv) => addCurrency(sum, inv.amount_inc_vat),
      0
    );
    const newTotalIncVat = addCurrency(primaryAmount, newLinkedAmounts);

    // Recalculate ex-VAT using branding theme
    // ORIGINAL XATA: const vatRate = getVATRateForBrandingTheme(sale.branding_theme);
    const vatRate = getVATRateForBrandingTheme(sale.brandingTheme);
    const newTotalExVat = calculateExVatWithRate(newTotalIncVat, vatRate);

    // Recalculate margins
    const margins = calculateMargins({
      saleAmountExVat: newTotalExVat,
      // ORIGINAL XATA: buyPrice: sale.buy_price,
      buyPrice: sale.buyPrice,
      // ORIGINAL XATA: shippingCost: sale.shipping_cost,
      shippingCost: sale.shippingCost,
      // ORIGINAL XATA: cardFees: sale.card_fees,
      cardFees: sale.cardFees,
      // ORIGINAL XATA: directCosts: sale.direct_costs,
      directCosts: sale.directCosts,
      // ORIGINAL XATA: introducerCommission: (sale as any).introducer_commission,
      introducerCommission: sale.introducerCommission,
    });

    logger.info('UNLINK_INVOICE', 'Recalculated totals', {
      saleId,
      primaryAmount,
      newLinkedAmounts,
      newTotalIncVat,
      newTotalExVat,
      grossMargin: margins.grossMargin,
      commissionableMargin: margins.commissionableMargin,
    });

    // Update the sale with updated linked invoices and recalculated totals
    // ORIGINAL XATA:
    // const updatedSale = await xata.db.Sales.update(saleId, {
    //   linked_invoices: updatedLinked.length > 0 ? updatedLinked : null,
    //   sale_amount_inc_vat: newTotalIncVat,
    //   sale_amount_ex_vat: newTotalExVat,
    //   gross_margin: margins.grossMargin,
    //   commissionable_margin: margins.commissionableMargin,
    // } as any);
    const updatedSaleResults = await db
      .update(sales)
      .set({
        linkedInvoices: updatedLinked.length > 0 ? updatedLinked : null,
        saleAmountIncVat: newTotalIncVat,
        saleAmountExVat: newTotalExVat,
        grossMargin: margins.grossMargin,
        commissionableMargin: margins.commissionableMargin,
      })
      .where(eq(sales.id, saleId))
      .returning();
    const updatedSale = updatedSaleResults[0] || null;

    // Restore the original import record if found
    if (originalImport) {
      // ORIGINAL XATA:
      // await xata.db.Sales.update(originalImport.id, {
      //   deleted_at: null,
      //   needs_allocation: true,
      // });
      await db
        .update(sales)
        .set({
          deletedAt: null,
          needsAllocation: true,
        })
        .where(eq(sales.id, originalImport.id));
      logger.info('UNLINK_INVOICE', 'Restored import as unallocated', {
        importId: originalImport.id,
        xeroInvoiceNumber: unlinkedInvoice.xero_invoice_number,
      });
    } else {
      logger.warn('UNLINK_INVOICE', 'Could not find original import to restore', {
        xero_invoice_id,
      });
    }

    logger.info('UNLINK_INVOICE', 'Invoice unlinked successfully', {
      saleId,
      xeroInvoiceNumber: unlinkedInvoice.xero_invoice_number,
    });

    return NextResponse.json({
      success: true,
      sale: updatedSale,
      unlinked_invoice: unlinkedInvoice,
      import_restored: !!originalImport,
    });
  } catch (error) {
    logger.error('UNLINK_INVOICE', 'Error unlinking invoice', { error: error as any });
    return NextResponse.json(
      { error: 'Failed to unlink invoice' },
      { status: 500 }
    );
  }
}
