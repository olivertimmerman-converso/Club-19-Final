/**
 * Club 19 Sales OS - Sales Summary Helper Functions
 *
 * Utility functions for computing derived fields and flags for sale summaries.
 * Used by /api/sales/summary and /api/sales/analytics endpoints.
 *
 * MIGRATION STATUS: Type import updated from SalesRecord to Sale (Feb 2026)
 */

// ORIGINAL XATA:
// import type { SalesRecord } from "@/src/xata";

// DRIZZLE TYPE IMPORT
import type { Sale } from "@/db/schema";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PaymentFlags {
  isPaid: boolean;
  isLocked: boolean;
  canLock: boolean;
  canPayCommission: boolean;
}

export interface OverdueFlags {
  is_overdue: boolean;
  days_overdue: number;
}

export interface MarginMetrics {
  margin_percent: number;
}

export type AuthenticityRisk = "clean" | "missing_receipt" | "not_verified" | "high_risk";

// ============================================================================
// PAYMENT & LIFECYCLE FLAGS
// ============================================================================

/**
 * Compute payment and commission lifecycle flags
 *
 * @param sale - Sale record from Drizzle
 * @returns Payment and lock status flags
 */
export function computePaymentFlags(sale: Sale): PaymentFlags {
  const status = sale.status || "";

  // Payment status
  const isPaid = status === "paid" || status === "locked" || status === "commission_paid";

  // Lock status
  const isLocked = status === "locked" || status === "commission_paid";

  // Can lock if paid but not yet locked
  const canLock = status === "paid";

  // Can pay commission if locked but not yet paid
  const canPayCommission = status === "locked";

  return {
    isPaid,
    isLocked,
    canLock,
    canPayCommission,
  };
}

// ============================================================================
// OVERDUE CALCULATION
// ============================================================================

/**
 * Compute overdue flags based on invoice due date
 *
 * @param sale - Sale record from Drizzle
 * @returns Overdue status and days overdue
 */
export function computeOverdueFlags(sale: Sale): OverdueFlags {
  const { isPaid } = computePaymentFlags(sale);

  // Not overdue if already paid
  if (isPaid) {
    return {
      is_overdue: false,
      days_overdue: 0,
    };
  }

  // Not overdue if no due date set
  // Note: invoice_due_date field doesn't exist in current schema
  // Always return not overdue for now
  return {
    is_overdue: false,
    days_overdue: 0,
  };

}

// ============================================================================
// MARGIN METRICS
// ============================================================================

/**
 * Compute margin percentage
 *
 * @param sale - Sale record from Drizzle
 * @returns Margin metrics
 */
export function computeMarginMetrics(sale: Sale): MarginMetrics {
  const commissionableMargin = sale.commissionableMargin || 0;
  const saleAmountIncVat = sale.saleAmountIncVat || 0;

  // Avoid division by zero
  if (saleAmountIncVat === 0) {
    return { margin_percent: 0 };
  }

  const margin_percent = (commissionableMargin / saleAmountIncVat) * 100;

  return { margin_percent };
}

// ============================================================================
// AUTHENTICITY RISK
// ============================================================================

/**
 * Compute authenticity risk level based on verification status and receipt
 *
 * @param sale - Sale record from Drizzle
 * @returns Authenticity risk level
 */
export function computeAuthenticityRisk(sale: Sale): AuthenticityRisk {
  // Note: authenticity_status and supplier_receipt_attached fields don't exist in current schema
  // Always return "not_verified" for now
  return "not_verified";
}
