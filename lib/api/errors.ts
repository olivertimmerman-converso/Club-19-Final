/**
 * Club 19 Sales OS - Errors API Client
 *
 * Wrapper functions for error-related backend endpoints
 */

"use client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ErrorGroupsSummary {
  total_errors: number;
  unresolved_errors: number;
  errors_by_type: Record<string, number>;
  errors_by_group: Record<string, number>;
  errors_by_severity: Record<string, number>;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get error groups summary
 *
 * @returns ErrorGroupsSummary
 * @throws Error if request fails
 */
export async function getErrorGroups(): Promise<ErrorGroupsSummary> {
  const response = await fetch("/api/errors/groups", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch error groups");
  }

  return response.json();
}
