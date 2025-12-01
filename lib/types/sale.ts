/**
 * Sale Payload for Make.com/Airtable Integration
 *
 * This payload is sent to Make.com immediately after successful Xero invoice creation
 * to sync sale data with Airtable for commission tracking and reporting.
 *
 * 19 FIELDS - Comprehensive sale data for commission calculation
 */

export interface SalePayload {
  // Core identifiers
  saleReference: string; // Invoice number
  saleDate: string; // ISO string YYYY-MM-DD

  // People
  shopperName: string; // Sales person (from Clerk)
  buyerName: string; // Customer name (from Xero)
  supplierName: string; // Supplier name

  // Item metadata
  brand: string; // Item brand
  category: string; // Item category
  itemTitle: string; // Item description/title
  quantity: number; // Quantity sold

  // Financials
  saleAmount: number; // Total invoice amount (inc VAT)
  buyPrice: number; // Item cost
  cardFees: number; // Card processing fees
  shippingCost: number; // Implied shipping cost
  directCosts: number; // buyPrice + cardFees + shippingCost

  // Economics
  impliedShipping: number; // Calculated shipping estimate
  grossMargin: number; // saleAmount - buyPrice
  commissionableMargin: number; // Gross margin minus costs

  // Xero & misc
  currency: string; // "GBP"
  brandingTheme: string; // Xero branding theme
  notes: string; // Notes (empty string if none)
}
