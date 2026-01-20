/**
 * Club 19 Sales OS - Link Invoice API
 *
 * POST: Link an unallocated Xero import to an existing sale
 * This allows multiple Xero invoices to be associated with a single sale
 * (e.g., when client pays in multiple parts - deposit + balance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/getUserRole';
import { getXataClient } from '@/src/xata';
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
 * POST /api/sales/[id]/link-invoice
 * Link an unallocated Xero import to this sale
 *
 * Body: { xero_import_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can link invoices
    const role = await getUserRole();
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - requires superadmin role' },
        { status: 403 }
      );
    }

    const { id: saleId } = await params;
    const body = await request.json();
    const { xero_import_id } = body;

    if (!xero_import_id) {
      return NextResponse.json(
        { error: 'xero_import_id is required' },
        { status: 400 }
      );
    }

    logger.info('LINK_INVOICE', 'Link invoice request', { saleId, xero_import_id });

    const xata = getXataClient();

    // Fetch the target sale
    const sale = await xata.db.Sales.read(saleId);
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Only allow linking to atelier sales
    if (sale.source !== 'atelier') {
      return NextResponse.json(
        { error: 'Can only link invoices to atelier sales' },
        { status: 400 }
      );
    }

    // Fetch the unallocated Xero import to link
    const xeroImport = await xata.db.Sales.read(xero_import_id);
    if (!xeroImport) {
      return NextResponse.json(
        { error: 'Xero import not found' },
        { status: 404 }
      );
    }

    // Validate it's an unallocated import
    if (xeroImport.source !== 'xero_import' || !xeroImport.needs_allocation) {
      return NextResponse.json(
        { error: 'Invoice is not an unallocated Xero import' },
        { status: 400 }
      );
    }

    // Check it's not already soft-deleted (linked elsewhere)
    if (xeroImport.deleted_at) {
      return NextResponse.json(
        { error: 'Invoice has already been linked or deleted' },
        { status: 400 }
      );
    }

    // Validate currencies match
    const saleCurrency = sale.currency || 'GBP';
    const importCurrency = xeroImport.currency || 'GBP';
    if (saleCurrency !== importCurrency) {
      return NextResponse.json(
        { error: `Cannot link invoice with different currency (sale: ${saleCurrency}, import: ${importCurrency})` },
        { status: 400 }
      );
    }

    // Get existing linked invoices array
    const existingLinked: LinkedInvoice[] = (sale as any).linked_invoices || [];

    // Check if already linked
    if (existingLinked.some(inv => inv.xero_invoice_id === xeroImport.xero_invoice_id)) {
      return NextResponse.json(
        { error: 'Invoice is already linked to this sale' },
        { status: 400 }
      );
    }

    // Create new linked invoice entry
    const newLinkedInvoice: LinkedInvoice = {
      xero_invoice_id: xeroImport.xero_invoice_id || '',
      xero_invoice_number: xeroImport.xero_invoice_number || 'Unknown',
      amount_inc_vat: roundCurrency(toNumber(xeroImport.sale_amount_inc_vat)),
      currency: importCurrency,
      invoice_date: xeroImport.sale_date ? xeroImport.sale_date.toISOString() : new Date().toISOString(),
      linked_at: new Date().toISOString(),
      linked_by: userId,
    };

    const updatedLinked = [...existingLinked, newLinkedInvoice];

    // Calculate new totals
    const primaryAmount = roundCurrency(toNumber(sale.sale_amount_inc_vat));
    const linkedAmounts = updatedLinked.reduce(
      (sum, inv) => addCurrency(sum, inv.amount_inc_vat),
      0
    );
    const totalIncVat = addCurrency(primaryAmount, linkedAmounts);

    // Recalculate ex-VAT using branding theme
    const vatRate = getVATRateForBrandingTheme(sale.branding_theme);
    const totalExVat = calculateExVatWithRate(totalIncVat, vatRate);

    // Recalculate margins
    const margins = calculateMargins({
      saleAmountExVat: totalExVat,
      buyPrice: sale.buy_price,
      shippingCost: sale.shipping_cost,
      cardFees: sale.card_fees,
      directCosts: sale.direct_costs,
      introducerCommission: (sale as any).introducer_commission,
    });

    logger.info('LINK_INVOICE', 'Recalculated totals', {
      saleId,
      primaryAmount,
      linkedAmounts,
      totalIncVat,
      totalExVat,
      grossMargin: margins.grossMargin,
      commissionableMargin: margins.commissionableMargin,
    });

    // Update the sale with new linked invoices and recalculated totals
    // Note: linked_invoices field must be added to Xata schema before this works
    const updatedSale = await xata.db.Sales.update(saleId, {
      linked_invoices: updatedLinked,
      sale_amount_inc_vat: totalIncVat,
      sale_amount_ex_vat: totalExVat,
      gross_margin: margins.grossMargin,
      commissionable_margin: margins.commissionableMargin,
    } as any);

    // Soft-delete the linked import
    await xata.db.Sales.update(xero_import_id, {
      deleted_at: new Date(),
      needs_allocation: false,
    });

    logger.info('LINK_INVOICE', 'Invoice linked successfully', {
      saleId,
      linkedInvoiceId: xero_import_id,
      xeroInvoiceNumber: newLinkedInvoice.xero_invoice_number,
    });

    return NextResponse.json({
      success: true,
      sale: updatedSale,
      linked_invoice: newLinkedInvoice,
    });
  } catch (error) {
    logger.error('LINK_INVOICE', 'Error linking invoice', { error: error as any });
    return NextResponse.json(
      { error: 'Failed to link invoice' },
      { status: 500 }
    );
  }
}
