/**
 * Club 19 Sales OS - Sales Summary Helper Functions
 *
 * Utility functions for computing derived fields and flags for sale summaries.
 * Used by /api/sales/summary and /api/sales/analytics endpoints.
 */

import type { SalesRecord } from "@/src/xata";

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
 * @param sale - Sale record from Xata
 * @returns Payment and lock status flags
 */
export function computePaymentFlags(sale: SalesRecord): PaymentFlags {
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
 * @param sale - Sale record from Xata
 * @returns Overdue status and days overdue
 */
export function computeOverdueFlags(sale: SalesRecord): OverdueFlags {
  const { isPaid } = computePaymentFlags(sale);

  // Not overdue if already paid
  if (isPaid) {
    return {
      is_overdue: false,
      days_overdue: 0,
    };
  }

  // Not overdue if no due date set
  if (!sale.invoice_due_date) {
    return {
      is_overdue: false,
      days_overdue: 0,
    };
  }

  // Calculate days overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const dueDate = new Date(sale.invoice_due_date);
  dueDate.setHours(0, 0, 0, 0); // Normalize to start of day

  const diffMs = today.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const is_overdue = diffDays > 0;
  const days_overdue = Math.max(0, diffDays);

  return {
    is_overdue,
    days_overdue,
  };
}

// ============================================================================
// MARGIN METRICS
// ============================================================================

/**
 * Compute margin percentage
 *
 * @param sale - Sale record from Xata
 * @returns Margin metrics
 */
export function computeMarginMetrics(sale: SalesRecord): MarginMetrics {
  const commissionableMargin = sale.commissionable_margin || 0;
  const saleAmountIncVat = sale.sale_amount_inc_vat || 0;

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
 * @param sale - Sale record from Xata
 * @returns Authenticity risk level
 */
export function computeAuthenticityRisk(sale: SalesRecord): AuthenticityRisk {
  const authenticityStatus = sale.authenticity_status || "";
  const supplierReceiptAttached = sale.supplier_receipt_attached || false;

  // High risk: Not verified at all
  if (authenticityStatus === "not_verified") {
    return "high_risk";
  }

  // Missing receipt: Verified but no supporting documentation
  if (!supplierReceiptAttached) {
    return "missing_receipt";
  }

  // Clean: Verified with receipt
  return "clean";
}
