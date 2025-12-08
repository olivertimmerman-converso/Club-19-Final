/**
 * Club 19 Sales OS - Date Utility Functions
 *
 * Helper functions for month filtering and date ranges
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get date range for a month filter value
 * @param monthParam - URL param value ("current", "last", "2025-01", or null for all time)
 * @returns DateRange or null for all time
 */
export function getMonthDateRange(monthParam: string | null): DateRange | null {
  if (!monthParam || monthParam === "all") {
    return null; // No filter - all time
  }

  const now = new Date();
  let year: number;
  let month: number;

  if (monthParam === "current") {
    year = now.getFullYear();
    month = now.getMonth();
  } else if (monthParam === "last") {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    year = lastMonth.getFullYear();
    month = lastMonth.getMonth();
  } else {
    // Format: "2025-01"
    const [yearStr, monthStr] = monthParam.split("-");
    year = parseInt(yearStr, 10);
    month = parseInt(monthStr, 10) - 1; // JavaScript months are 0-indexed
  }

  // Start of month: first day at 00:00:00
  const start = new Date(year, month, 1, 0, 0, 0, 0);

  // End of month: last day at 23:59:59
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Format a month param into a human-readable label
 * @param monthParam - URL param value
 * @returns Formatted label
 */
export function formatMonthLabel(monthParam: string | null): string {
  if (!monthParam || monthParam === "all") {
    return "All Time";
  }

  if (monthParam === "current") {
    return "This Month";
  }

  if (monthParam === "last") {
    return "Last Month";
  }

  // Format: "2025-01"
  const [yearStr, monthStr] = monthParam.split("-");
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);

  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Check if a date falls within a date range
 * @param date - Date to check
 * @param range - DateRange or null for no filter
 * @returns boolean
 */
export function isDateInRange(
  date: Date | string | null | undefined,
  range: DateRange | null
): boolean {
  if (!date) return false;
  if (!range) return true; // No filter - include all

  const checkDate = typeof date === "string" ? new Date(date) : date;

  return checkDate >= range.start && checkDate <= range.end;
}
