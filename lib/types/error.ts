/**
 * Club 19 Sales OS - Error Types
 *
 * Centralized error type definitions for type-safe error handling
 */

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorType {
  DATA_VALIDATION = "data_validation",
  BUSINESS_LOGIC = "business_logic",
  EXTERNAL_SERVICE = "external_service",
  INTERNAL_ERROR = "internal_error",
}

/**
 * Metadata attached to error records
 */
export interface ErrorMetadata {
  saleId?: string;
  userId?: string;
  apiRoute?: string;
  timestamp?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Error record stored in database
 */
export interface ErrorRecord {
  id: string;
  error_type: ErrorType;
  error_group: string;
  severity: ErrorSeverity;
  source: string;
  message: string[];
  metadata: ErrorMetadata;
  triggered_by: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Extended Error type for application errors
 */
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'code' in error;
}

/**
 * Convert unknown error to safe error object
 */
export function toErrorObject(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}
