/**
 * Club 19 Sales OS - Error Type Constants
 *
 * Centralized error type definitions for consistent error categorization
 * across the entire system
 */

export const ERROR_TYPES = {
  VALIDATION: "validation",
  ECONOMICS: "economics",
  COMMISSION: "commission",
  LIFECYCLE: "lifecycle",
  WEBHOOK: "webhook",
  SYNC: "sync",
  INTEGRITY: "integrity",
  SYSTEM: "system",
  UNKNOWN: "unknown",
} as const;

export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type ErrorSeverity = (typeof ERROR_SEVERITY)[keyof typeof ERROR_SEVERITY];

/**
 * Error triggered by sources
 */
export const ERROR_TRIGGERED_BY = {
  BACKEND: "backend",
  WEBHOOK: "webhook",
  CRON: "cron",
  MANUAL: "manual",
  VALIDATION: "validation",
  COMMISSION_ENGINE: "commission-engine",
  DEAL_LIFECYCLE: "deal-lifecycle",
  XERO_SYNC: "xero-sync",
  SYSTEM: "system",
} as const;

export type ErrorTriggeredBy =
  (typeof ERROR_TRIGGERED_BY)[keyof typeof ERROR_TRIGGERED_BY];

/**
 * Error groups for categorization and filtering (Story 6)
 * Helps organize errors by business domain for easier triage
 */
export const ERROR_GROUPS = {
  SALE_CREATION: "sale_creation", // Errors during initial sale creation
  DATA_VALIDATION: "data_validation", // Input validation failures
  COMMISSION_CALC: "commission_calc", // Commission calculation issues
  ECONOMICS_SANITY: "economics_sanity", // Margin/pricing warnings
  PAYMENT_LIFECYCLE: "payment_lifecycle", // Invoice status transitions
  XERO_INTEGRATION: "xero_integration", // Xero API sync issues
  AUTHENTICITY: "authenticity", // Authenticity verification issues
  SYSTEM_ERROR: "system_error", // Unexpected system errors
} as const;

export type ErrorGroup = (typeof ERROR_GROUPS)[keyof typeof ERROR_GROUPS];
