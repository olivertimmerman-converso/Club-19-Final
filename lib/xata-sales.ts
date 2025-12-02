/**
 * Xata Sales OS - Master Backend Module
 *
 * Consolidated integration layer for Club 19 Sales OS
 * Handles all Xata database operations for sales tracking
 */

import { XataClient } from "@/src/xata";
import type {
  ShoppersRecord,
  BuyersRecord,
  SuppliersRecord,
  IntroducersRecord,
  CommissionBandsRecord,
  SalesRecord,
} from "@/src/xata";

// ============================================================================
// CLIENT SINGLETON
// ============================================================================

let _xata: XataClient | null = null;

export function xata() {
  if (!_xata) _xata = new XataClient();
  return _xata;
}

// ============================================================================
// UPSTREAM TABLE HELPERS - SHOPPERS
// ============================================================================

export async function getOrCreateShopperByName(
  name: string
): Promise<ShoppersRecord> {
  const existing = await xata().db.Shoppers.filter({ name }).getFirst();
  if (existing) return existing;

  return await xata().db.Shoppers.create({
    name,
    email: "",
    commission_scheme: "",
    active: true,
  });
}

export async function getShopperByClerkId(
  clerkId: string
): Promise<ShoppersRecord | null> {
  // Assuming clerk_id is stored in a custom field or matched by name
  // Adjust this based on your actual Clerk integration
  return await xata().db.Shoppers.filter({ name: clerkId }).getFirst();
}

// ============================================================================
// UPSTREAM TABLE HELPERS - BUYERS
// ============================================================================

export async function getOrCreateBuyer(
  name: string,
  email?: string,
  xero_contact_id?: string
): Promise<BuyersRecord> {
  // Try to find by name first
  let existing = await xata().db.Buyers.filter({ name }).getFirst();
  if (existing) return existing;

  // Try to find by Xero contact ID if provided
  if (xero_contact_id) {
    existing = await xata()
      .db.Buyers.filter({ xero_contact_id })
      .getFirst();
    if (existing) return existing;
  }

  // Create new buyer
  return await xata().db.Buyers.create({
    name,
    email: email || "",
    xero_contact_id: xero_contact_id || "",
  });
}

// ============================================================================
// UPSTREAM TABLE HELPERS - SUPPLIERS
// ============================================================================

export async function getOrCreateSupplier(
  name: string,
  email?: string,
  xero_contact_id?: string
): Promise<SuppliersRecord> {
  // Try to find by name first
  let existing = await xata().db.Suppliers.filter({ name }).getFirst();
  if (existing) return existing;

  // Try to find by Xero contact ID if provided
  if (xero_contact_id) {
    existing = await xata()
      .db.Suppliers.filter({ xero_contact_id })
      .getFirst();
    if (existing) return existing;
  }

  // Create new supplier
  return await xata().db.Suppliers.create({
    name,
    email: email || "",
    xero_contact_id: xero_contact_id || "",
  });
}

// ============================================================================
// UPSTREAM TABLE HELPERS - INTRODUCERS
// ============================================================================

export async function getOrCreateIntroducer(
  name: string,
  commission_percent?: number
): Promise<IntroducersRecord> {
  const existing = await xata().db.Introducers.filter({ name }).getFirst();
  if (existing) return existing;

  return await xata().db.Introducers.create({
    name,
    commission_percent: commission_percent || 0,
  });
}

// ============================================================================
// UPSTREAM TABLE HELPERS - COMMISSION BANDS
// ============================================================================

export async function getCommissionBandForMargin(
  margin: number
): Promise<CommissionBandsRecord | null> {
  // Find the band where margin falls between min and max threshold
  const bands = await xata().db.CommissionBands.getAll();

  for (const band of bands) {
    if (
      margin >= (band.min_threshold || 0) &&
      margin <= (band.max_threshold || Infinity)
    ) {
      return band;
    }
  }

  return null;
}

// ============================================================================
// SALE ECONOMICS CALCULATION
// ============================================================================

export interface SaleEconomicsInput {
  sale_amount_inc_vat: number;
  buy_price: number;
  card_fees: number;
  shipping_cost: number;
}

export interface SaleEconomicsResult {
  sale_amount_ex_vat: number;
  direct_costs: number;
  implied_shipping: number;
  gross_margin: number;
  commissionable_margin: number;
}

export function calculateSaleEconomics(
  fields: SaleEconomicsInput
): SaleEconomicsResult {
  const VAT_RATE = 0.2; // 20% UK VAT

  // Sale amount ex VAT = sale amount inc VAT / 1.2
  const sale_amount_ex_vat = fields.sale_amount_inc_vat / (1 + VAT_RATE);

  // Direct costs = card fees + shipping cost
  const direct_costs = fields.card_fees + fields.shipping_cost;

  // Implied shipping = shipping cost component from sale price
  // Assuming shipping is a percentage of sale price or flat fee
  const implied_shipping = fields.shipping_cost;

  // Gross margin = sale amount ex VAT - buy price - direct costs
  const gross_margin = sale_amount_ex_vat - fields.buy_price - direct_costs;

  // Commissionable margin = gross margin (can be adjusted with additional logic)
  const commissionable_margin = gross_margin;

  return {
    sale_amount_ex_vat,
    direct_costs,
    implied_shipping,
    gross_margin,
    commissionable_margin,
  };
}

// ============================================================================
// MASTER SALE CREATION FUNCTION
// ============================================================================

export interface CreateSalePayload {
  // Core identifiers
  sale_reference: string;
  sale_date: Date;

  // Party names (will be resolved to IDs)
  shopperName: string;
  shopperEmail?: string;
  buyerName: string;
  buyerEmail?: string;
  buyerXeroId?: string;
  supplierName: string;
  supplierEmail?: string;
  supplierXeroId?: string;
  introducerName?: string;
  introducerCommission?: number;

  // Item metadata
  brand?: string;
  category?: string;
  item_title?: string;
  quantity?: number;

  // Financial inputs (for economics calculation)
  sale_amount_inc_vat: number;
  buy_price: number;
  card_fees?: number;
  shipping_cost?: number;

  // Xero metadata
  currency?: string;
  branding_theme?: string;
  xero_invoice_number?: string;
  xero_invoice_id?: string;
  xero_invoice_url?: string;
  invoice_status?: string;
  invoice_paid_date?: Date;

  // Notes
  internal_notes?: string;
}

export async function createSaleFromAppPayload(
  payload: CreateSalePayload
): Promise<SalesRecord> {
  // A) RESOLVE RELATIONAL TABLES
  console.log("[XATA SALES] Resolving relationships...");

  const shopper = await getOrCreateShopperByName(payload.shopperName);
  console.log(`[XATA SALES] ✓ Shopper: ${shopper.name} (${shopper.id})`);

  const buyer = await getOrCreateBuyer(
    payload.buyerName,
    payload.buyerEmail,
    payload.buyerXeroId
  );
  console.log(`[XATA SALES] ✓ Buyer: ${buyer.name} (${buyer.id})`);

  const supplier = await getOrCreateSupplier(
    payload.supplierName,
    payload.supplierEmail,
    payload.supplierXeroId
  );
  console.log(`[XATA SALES] ✓ Supplier: ${supplier.name} (${supplier.id})`);

  let introducer: IntroducersRecord | null = null;
  if (payload.introducerName) {
    introducer = await getOrCreateIntroducer(
      payload.introducerName,
      payload.introducerCommission
    );
    console.log(`[XATA SALES] ✓ Introducer: ${introducer.name} (${introducer.id})`);
  }

  // B) COMPUTE ECONOMICS
  console.log("[XATA SALES] Computing economics...");

  const economics = calculateSaleEconomics({
    sale_amount_inc_vat: payload.sale_amount_inc_vat,
    buy_price: payload.buy_price,
    card_fees: payload.card_fees || 0,
    shipping_cost: payload.shipping_cost || 0,
  });

  console.log(`[XATA SALES] ✓ Gross margin: ${economics.gross_margin.toFixed(2)}`);
  console.log(
    `[XATA SALES] ✓ Commissionable margin: ${economics.commissionable_margin.toFixed(2)}`
  );

  // Find commission band based on commissionable margin
  const commissionBand = await getCommissionBandForMargin(
    economics.commissionable_margin
  );
  if (commissionBand) {
    console.log(
      `[XATA SALES] ✓ Commission band: ${commissionBand.band_type} (${commissionBand.commission_percent}%)`
    );
  }

  // C) INSERT INTO XATA SALES TABLE
  console.log("[XATA SALES] Creating sale record...");

  const sale = await xata().db.Sales.create({
    // Core identifiers
    sale_reference: payload.sale_reference,
    sale_date: payload.sale_date,

    // Relationships
    shopper: shopper.id,
    buyer: buyer.id,
    supplier: supplier.id,
    introducer: introducer?.id,
    commission_band: commissionBand?.id,

    // Item metadata
    brand: payload.brand || "",
    category: payload.category || "",
    item_title: payload.item_title || "",
    quantity: payload.quantity || 1,

    // Financial fields
    sale_amount_inc_vat: payload.sale_amount_inc_vat,
    sale_amount_ex_vat: economics.sale_amount_ex_vat,
    buy_price: payload.buy_price,
    card_fees: payload.card_fees || 0,
    shipping_cost: payload.shipping_cost || 0,
    direct_costs: economics.direct_costs,

    // Economics
    implied_shipping: economics.implied_shipping,
    gross_margin: economics.gross_margin,
    commissionable_margin: economics.commissionable_margin,

    // Xero metadata
    currency: payload.currency || "GBP",
    branding_theme: payload.branding_theme || "",
    xero_invoice_number: payload.xero_invoice_number || "",
    xero_invoice_id: payload.xero_invoice_id || "",
    xero_invoice_url: payload.xero_invoice_url || "",
    invoice_status: payload.invoice_status || "DRAFT",
    invoice_paid_date: payload.invoice_paid_date,

    // Commission tracking (defaults)
    commission_locked: false,
    commission_paid: false,
    commission_lock_date: undefined,
    commission_paid_date: undefined,

    // Notes
    internal_notes: payload.internal_notes || "",
  });

  console.log(`[XATA SALES] ✅ Sale created: ${sale.id}`);

  // D) RETURN THE CREATED SALE RECORD
  return sale;
}

// ============================================================================
// INVOICE SYNC WRAPPER
// ============================================================================

export interface XeroInvoiceData {
  InvoiceNumber: string;
  Date: string;
  Contact: {
    Name: string;
    ContactID: string;
    EmailAddress?: string;
  };
  CurrencyCode?: string;
  BrandingThemeID?: string;
  InvoiceID: string;
  Status: string;
  Total: number;
  // Add other Xero invoice fields as needed
}

export interface AppFormData {
  // Parties
  shopperName: string;
  shopperEmail?: string;
  supplierName: string;
  supplierEmail?: string;
  supplierXeroId?: string;
  introducerName?: string;
  introducerCommission?: number;

  // Item details
  brand?: string;
  category?: string;
  itemTitle?: string;
  quantity?: number;

  // Financial data
  buyPrice: number;
  cardFees?: number;
  shippingCost?: number;

  // Notes
  internalNotes?: string;
}

export async function syncInvoiceAndAppDataToXata(params: {
  xeroInvoice: XeroInvoiceData;
  formData: AppFormData;
}): Promise<SalesRecord | null> {
  try {
    console.log("[XATA SALES] Starting invoice sync...");
    console.log("[XATA] Incoming Xero invoice:", params.xeroInvoice);
    console.log("[XATA] Incoming form data:", params.formData);

    // Validate required fields
    if (!params.xeroInvoice.InvoiceNumber) {
      console.warn("[XATA] Missing InvoiceNumber — aborting sync.");
      return null;
    }

    if (!params.formData.shopperName) {
      console.warn("[XATA] Missing shopperName — aborting sync.");
      return null;
    }

    const payload: CreateSalePayload = {
      // Core identifiers from Xero
      sale_reference: params.xeroInvoice.InvoiceNumber,
      sale_date: new Date(params.xeroInvoice.Date),

      // Parties
      shopperName: params.formData.shopperName,
      shopperEmail: params.formData.shopperEmail,
      buyerName: params.xeroInvoice.Contact.Name,
      buyerEmail: params.xeroInvoice.Contact.EmailAddress,
      buyerXeroId: params.xeroInvoice.Contact.ContactID,
      supplierName: params.formData.supplierName,
      supplierEmail: params.formData.supplierEmail,
      supplierXeroId: params.formData.supplierXeroId,
      introducerName: params.formData.introducerName,
      introducerCommission: params.formData.introducerCommission,

      // Item metadata from form
      brand: params.formData.brand,
      category: params.formData.category,
      item_title: params.formData.itemTitle,
      quantity: params.formData.quantity,

      // Financial data
      sale_amount_inc_vat: params.xeroInvoice.Total,
      buy_price: params.formData.buyPrice,
      card_fees: params.formData.cardFees,
      shipping_cost: params.formData.shippingCost,

      // Xero metadata
      currency: params.xeroInvoice.CurrencyCode,
      branding_theme: params.xeroInvoice.BrandingThemeID,
      xero_invoice_number: params.xeroInvoice.InvoiceNumber,
      xero_invoice_id: params.xeroInvoice.InvoiceID,
      xero_invoice_url: `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${params.xeroInvoice.InvoiceID}`,
      invoice_status: params.xeroInvoice.Status,

      // Notes
      internal_notes: params.formData.internalNotes,
    };

    const sale = await createSaleFromAppPayload(payload);

    console.log("[XATA SALES] ✅ Invoice sync complete");
    return sale;
  } catch (error) {
    console.error("[XATA SALES] ❌ Invoice sync failed (non-fatal):", error);
    // Don't throw - log and continue
    return null;
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get all sales for a specific shopper
 */
export async function getSalesByShopperId(shopperId: string): Promise<SalesRecord[]> {
  return await xata()
    .db.Sales.filter({ "shopper.id": shopperId })
    .sort("sale_date", "desc")
    .getMany();
}

/**
 * Get total commissionable margin for a shopper (unpaid)
 */
export async function getUnpaidCommissionForShopper(
  shopperId: string
): Promise<number> {
  const sales = await xata()
    .db.Sales.filter({
      "shopper.id": shopperId,
      commission_paid: false,
    })
    .getMany();

  return sales.reduce((sum, sale) => sum + (sale.commissionable_margin || 0), 0);
}

/**
 * Lock all unpaid commissions up to a specific date
 */
export async function lockCommissionsUpToDate(date: Date): Promise<number> {
  const sales = await xata()
    .db.Sales.filter({
      sale_date: { $le: date },
      commission_locked: false,
    })
    .getMany();

  let count = 0;
  for (const sale of sales) {
    await xata().db.Sales.update(sale.id, {
      commission_locked: true,
      commission_lock_date: new Date(),
    });
    count++;
  }

  return count;
}
