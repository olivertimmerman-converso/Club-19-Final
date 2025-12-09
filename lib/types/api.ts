/**
 * Club 19 Sales OS - API Types
 *
 * Shared types for API request/response handling
 */

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  statusCode?: number;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  data?: T;
  success?: boolean;
  count?: number;
  timestamp?: string;
  message?: string;
}

/**
 * Union type for API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response
  );
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
