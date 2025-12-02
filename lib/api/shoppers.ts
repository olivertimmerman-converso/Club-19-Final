/**
 * Club 19 Sales OS - Shopper API Client
 *
 * Wrapper functions for shopper-specific data fetching
 * Filters sales summary to only show sales for the current shopper
 */

"use client";

import { getSalesSummary, type SaleSummary, type SalesSummaryResponse } from "./sales";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ShopperMetrics {
  total_sales: number;
  total_revenue: number;
  total_margin: number;
  average_margin_percent: number;
  paid_sales: number;
  unpaid_sales: number;
  overdue_sales: number;
  authenticity_issues: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch sales summary filtered to a specific shopper
 *
 * @param userName - Shopper's name to filter by (matches sale.shopper_name)
 * @returns Filtered sales array
 * @throws Error if request fails
 */
export async function getShopperSalesSummary(userName: string): Promise<SaleSummary[]> {
  const response = await getSalesSummary();

  // Filter to only sales for this shopper
  const shopperSales = response.sales.filter(
    (sale) => sale.shopper_name.toLowerCase() === userName.toLowerCase()
  );

  return shopperSales;
}

/**
 * Get full list of sales for a specific shopper
 * Alias for getShopperSalesSummary for consistency
 *
 * @param userName - Shopper's name
 * @returns Filtered sales array
 * @throws Error if request fails
 */
export async function getShopperSalesList(userName: string): Promise<SaleSummary[]> {
  return getShopperSalesSummary(userName);
}

/**
 * Compute shopper-specific metrics from sales data
 *
 * @param sales - Array of sales for the shopper
 * @returns ShopperMetrics object
 */
export function computeShopperMetrics(sales: SaleSummary[]): ShopperMetrics {
  let total_revenue = 0;
  let total_margin = 0;
  let paid_sales = 0;
  let unpaid_sales = 0;
  let overdue_sales = 0;
  let authenticity_issues = 0;

  for (const sale of sales) {
    total_revenue += sale.sale_amount_inc_vat || 0;
    total_margin += sale.commissionable_margin || 0;

    if (sale.isPaid) {
      paid_sales++;
    } else {
      unpaid_sales++;
    }

    if (sale.is_overdue) {
      overdue_sales++;
    }

    if (
      sale.authenticity_risk === "high_risk" ||
      sale.authenticity_risk === "missing_receipt" ||
      sale.authenticity_risk === "not_verified"
    ) {
      authenticity_issues++;
    }
  }

  const average_margin_percent =
    total_revenue > 0 ? (total_margin / total_revenue) * 100 : 0;

  return {
    total_sales: sales.length,
    total_revenue,
    total_margin,
    average_margin_percent,
    paid_sales,
    unpaid_sales,
    overdue_sales,
    authenticity_issues,
  };
}
