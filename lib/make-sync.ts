/**
 * Make.com Sale Sync Utility
 *
 * Syncs sale data to Make.com/Airtable immediately after successful Xero invoice creation.
 * This enables commission tracking, reporting, and deal management.
 */

import { SalePayload } from "@/lib/types/sale";

/**
 * Make.com webhook URL for sale sync
 * This webhook receives sale data and syncs it to Airtable
 */
const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/o4z51g88wep546r1bkx7wo7ck2249zq7";

/**
 * Sync sale data to Make.com/Airtable
 *
 * This function is called immediately after successful Xero invoice creation.
 * It sends the sale payload to Make.com for processing and Airtable sync.
 *
 * Features:
 * - Non-blocking (awaits the fetch but doesn't block invoice creation)
 * - Error handling with console logging (doesn't throw)
 * - Production-ready with comprehensive logging
 *
 * @param payload - Sale data payload conforming to SalePayload interface
 * @returns Promise<void> - Resolves when sync completes or fails (never throws)
 *
 * @example
 * ```typescript
 * await syncSaleToMake({
 *   saleReference: "INV-12345",
 *   saleDate: "2025-12-01",
 *   shopperName: "Sophie Williams",
 *   buyerName: "John Smith",
 *   supplierName: "Harrods",
 *   saleAmount: 15000,
 *   directCosts: 12000,
 *   currency: "GBP",
 *   notes: "",
 * });
 * ```
 */
export async function syncSaleToMake(payload: SalePayload): Promise<void> {
  const startTime = Date.now();
  console.log("[MAKE SYNC] === Syncing sale to Make.com ===");
  console.log("[MAKE SYNC] Sale Reference:", payload.saleReference);
  console.log("[MAKE SYNC] Buyer:", payload.buyerName);
  console.log("[MAKE SYNC] Supplier:", payload.supplierName);
  console.log("[MAKE SYNC] Amount:", `${payload.currency} ${payload.saleAmount}`);

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MAKE SYNC] ❌ Failed to sync sale to Make:");
      console.error(`[MAKE SYNC] Status: ${response.status} ${response.statusText}`);
      console.error(`[MAKE SYNC] Response: ${errorText}`);
      console.error(`[MAKE SYNC] Duration: ${duration}ms`);
      return; // Don't throw - just log the error
    }

    // Try to parse response for logging
    let responseData;
    try {
      responseData = await response.json();
      console.log("[MAKE SYNC] ✓✓✓ Sale synced successfully to Make.com");
      console.log(`[MAKE SYNC] Duration: ${duration}ms`);
      console.log("[MAKE SYNC] Response:", responseData);
    } catch {
      // Response might not be JSON, that's okay
      console.log("[MAKE SYNC] ✓✓✓ Sale synced successfully to Make.com");
      console.log(`[MAKE SYNC] Duration: ${duration}ms`);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[MAKE SYNC] ❌ Error syncing sale to Make:");
    console.error(`[MAKE SYNC] Error: ${error.message || error}`);
    console.error(`[MAKE SYNC] Duration: ${duration}ms`);
    // Don't throw - just log the error
  }
}

/**
 * Build sale payload from invoice data
 *
 * Constructs a SalePayload with EXACTLY 19 fields for Make.com/Airtable.
 * Includes comprehensive deal data for commission calculation.
 *
 * @param data - Invoice and sale data
 * @returns SalePayload with 19 fields
 *
 * @example
 * ```typescript
 * const payload = buildSalePayload({
 *   invoiceNumber: "INV-12345",
 *   invoiceDate: new Date(),
 *   shopperName: "Sophie Williams",
 *   buyerName: "John Smith",
 *   supplierName: "Harrods",
 *   brand: "Chanel",
 *   category: "Handbags",
 *   itemTitle: "Classic Flap Bag",
 *   quantity: 1,
 *   saleAmount: 15000,
 *   buyPrice: 12000,
 *   cardFees: 300,
 *   shippingCost: 100,
 *   impliedShipping: 100,
 *   grossMargin: 3000,
 *   commissionableMargin: 2600,
 *   currency: "GBP",
 *   brandingTheme: "Standard",
 *   notes: "Luxury handbag deal",
 * });
 * ```
 */
export function buildSalePayload(data: {
  invoiceNumber: string;
  invoiceDate: Date;
  shopperName: string;
  buyerName: string;
  supplierName: string;

  // Item data from StepReview
  brand: string;
  category: string;
  itemTitle: string;
  quantity: number;

  // Financials
  saleAmount: number;
  buyPrice: number;
  cardFees: number;
  shippingCost: number;

  // Economics passed from UI
  impliedShipping: number;
  grossMargin: number;
  commissionableMargin: number;

  // Misc
  currency: string;
  brandingTheme: string;
  notes?: string;
}): SalePayload {
  // Calculate direct costs (supplier cost + card fees + shipping)
  const directCosts = data.buyPrice + data.cardFees + data.shippingCost;

  return {
    // Core identifiers
    saleReference: data.invoiceNumber,
    saleDate: data.invoiceDate.toISOString().split("T")[0],

    // People
    shopperName: data.shopperName,
    buyerName: data.buyerName,
    supplierName: data.supplierName,

    // Item metadata
    brand: data.brand,
    category: data.category,
    itemTitle: data.itemTitle,
    quantity: data.quantity,

    // Financials
    saleAmount: data.saleAmount,
    buyPrice: data.buyPrice,
    cardFees: data.cardFees,
    shippingCost: data.shippingCost,
    directCosts: directCosts,

    // Economics
    impliedShipping: data.impliedShipping,
    grossMargin: data.grossMargin,
    commissionableMargin: data.commissionableMargin,

    // Xero & misc
    currency: data.currency,
    brandingTheme: data.brandingTheme,
    notes: data.notes || "",
  };
}
