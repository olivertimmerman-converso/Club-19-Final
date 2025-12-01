/**
 * Sale Payload for Make.com/Airtable Integration
 *
 * This payload is sent to Make.com immediately after successful Xero invoice creation
 * to sync sale data with Airtable for commission tracking and reporting.
 *
 * ONLY 9 FIELDS - No additional fields should be added
 */

export interface SalePayload {
  saleReference: string; // Invoice number
  saleDate: string; // ISO string YYYY-MM-DD
  shopperName: string; // Sales person (from Clerk)
  buyerName: string; // Customer name (from Xero)
  supplierName: string; // Supplier name
  saleAmount: number; // Total invoice amount (inc VAT)
  directCosts: number; // Buy price + card fees + shipping
  currency: string; // "GBP"
  notes: string; // Notes (empty string if none)
}
