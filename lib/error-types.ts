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
