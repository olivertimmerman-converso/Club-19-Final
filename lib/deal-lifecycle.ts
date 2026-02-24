/**
 * Club 19 Sales OS - Deal Lifecycle Engine
 *
 * Manages deal status transitions through the lifecycle:
 * draft → invoiced → paid → locked → commission_paid
 *
 * Validates transitions, updates sale fields, and logs errors
 * for invalid state changes.
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

// ORIGINAL XATA:
// import { getXataClient } from "@/src/xata";

// DRIZZLE IMPORTS
import { db } from "@/db";
import { sales, errors } from "@/db/schema";
import { eq } from "drizzle-orm";

import { ERROR_TYPES, ERROR_TRIGGERED_BY } from "./error-types";
import * as logger from './logger';

// ============================================================================
// CLIENT SINGLETON (DEPRECATED - Kept for backwards compatibility)
// ============================================================================

// ORIGINAL XATA:
// let _xata: ReturnType<typeof getXataClient> | null = null;
//
// export function xata() {
//   if (_xata) return _xata;
//   _xata = getXataClient();
//   return _xata;
// }

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DealStatus = "draft" | "invoiced" | "paid" | "locked" | "commission_paid" | "ongoing";

export interface TransitionSaleStatusArgs {
  saleId: string;
  currentStatus: string;
  nextStatus: string;
  xeroPaymentDate?: Date;
  adminUserEmail?: string;
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  newStatus?: string;
}

// ============================================================================
// VALID TRANSITIONS
// ============================================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["invoiced"],
  invoiced: ["paid", "ongoing"],
  ongoing: ["paid"],
  paid: ["locked"],
  locked: ["commission_paid"],
  commission_paid: [], // Terminal state
};

// ============================================================================
// TRANSITION VALIDATION
// ============================================================================

/**
 * Check if a status transition is allowed
 *
 * Valid transitions:
 * - draft → invoiced
 * - invoiced → paid
 * - paid → locked
 * - locked → commission_paid
 *
 * @param currentStatus - Current sale status
 * @param nextStatus - Desired next status
 * @returns true if transition is valid, false otherwise
 */
export function canTransition(currentStatus: string, nextStatus: string): boolean {
  const allowedNextStates = VALID_TRANSITIONS[currentStatus] || [];
  return allowedNextStates.includes(nextStatus);
}

// ============================================================================
// STATUS TRANSITION
// ============================================================================

/**
 * Transition a sale to a new status
 *
 * This function:
 * 1. Validates the transition is allowed
 * 2. Updates the sale status
 * 3. Updates relevant timestamps and flags based on new status
 * 4. Logs errors for invalid transitions
 *
 * @param args - Transition parameters
 * @returns Result indicating success or failure
 */
export async function transitionSaleStatus(
  args: TransitionSaleStatusArgs
): Promise<TransitionResult> {
  const { saleId, currentStatus, nextStatus, xeroPaymentDate, adminUserEmail } = args;

  logger.info('LIFECYCLE', `Attempting transition: ${currentStatus} → ${nextStatus} (Sale: ${saleId})`);

  // STEP 1: Validate transition
  if (!canTransition(currentStatus, nextStatus)) {
    const errorMessage = `Invalid transition: ${currentStatus} → ${nextStatus}`;
    logger.error('LIFECYCLE', errorMessage);

    // Log to Errors table
    try {
      // ORIGINAL XATA:
      // await xata().db.Errors.create({
      //   sale: saleId,
      //   severity: "medium",
      //   source: "deal-lifecycle",
      //   message: [errorMessage],
      //   timestamp: new Date(),
      //   resolved: false,
      // });

      // DRIZZLE:
      await db.insert(errors).values({
        saleId: saleId,
        severity: "medium",
        source: "deal-lifecycle",
        message: [errorMessage],
        timestamp: new Date(),
        resolved: false,
      });
      logger.info('LIFECYCLE', 'Error logged to Errors table');
    } catch (err) {
      logger.error('LIFECYCLE', 'Failed to log error', { error: err as any } as any);
    }

    // Set error flag on sale
    try {
      // ORIGINAL XATA:
      // await xata().db.Sales.update(saleId, {
      //   error_flag: true,
      //   error_message: [errorMessage],
      // });

      // DRIZZLE:
      await db.update(sales).set({
        errorFlag: true,
        errorMessage: [errorMessage],
      }).where(eq(sales.id, saleId));
    } catch (err) {
      logger.error('LIFECYCLE', 'Failed to set error flag', { error: err as any } as any);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }

  // STEP 2: Prepare update fields
  const updateFields: Record<string, any> = {
    status: nextStatus,
  };

  // STEP 3: Set status-specific fields
  switch (nextStatus) {
    case "paid":
      // Update payment date from Xero or use current timestamp
      updateFields.xeroPaymentDate = xeroPaymentDate || new Date();
      logger.info('LIFECYCLE', `Setting xeroPaymentDate: ${updateFields.xeroPaymentDate}`);
      break;

    case "locked":
      // Lock commission for month-end processing
      updateFields.commissionLocked = true;
      updateFields.commissionLockDate = new Date();
      logger.info('LIFECYCLE', `Locking commission at: ${updateFields.commissionLockDate}`);
      break;

    case "commission_paid":
      // Mark commission as paid
      updateFields.commissionPaid = true;
      updateFields.commissionPaidDate = new Date();
      logger.info('LIFECYCLE', `Marking commission paid at: ${updateFields.commissionPaidDate}`);
      break;
  }

  // STEP 4: Apply updates to sale
  try {
    // ORIGINAL XATA:
    // await xata().db.Sales.update(saleId, updateFields);

    // DRIZZLE:
    await db.update(sales).set(updateFields).where(eq(sales.id, saleId));
    logger.info('LIFECYCLE', `Sale ${saleId} transitioned to "${nextStatus}"`);

    return {
      success: true,
      newStatus: nextStatus,
    };
  } catch (err) {
    const errorMessage = `Failed to update sale status: ${err}`;
    logger.error('LIFECYCLE', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all valid next states for a given status
 *
 * @param currentStatus - Current sale status
 * @returns Array of valid next statuses
 */
export function getValidNextStates(currentStatus: string): string[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status is a terminal state (no further transitions)
 *
 * @param status - Status to check
 * @returns true if terminal, false otherwise
 */
export function isTerminalState(status: string): boolean {
  const nextStates = VALID_TRANSITIONS[status] || [];
  return nextStates.length === 0;
}
