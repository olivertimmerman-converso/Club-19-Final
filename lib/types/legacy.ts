/**
 * Club 19 Sales OS - Legacy Data Types
 *
 * Type definitions for legacy trade data migration
 */

/**
 * Legacy trade record from legacy_trades table
 */
export interface LegacyTradeRow {
  id: string;
  trade_date: string | null;
  invoice_number: string;
  raw_client: string;
  raw_supplier: string;
  item: string;
  brand: string;
  category: string;
  buy_price: number;
  sell_price: number;
  margin: number;
  source: "Hope" | "MC" | string;
  commission_paid?: boolean;
  notes?: string;
}

/**
 * Legacy client record from legacy_clients table
 */
export interface LegacyClientRow {
  id: string;
  client_clean: string;
  buyer_id?: string;
  requires_review: boolean;
  reviewed_at?: string;
}

/**
 * Legacy supplier record from legacy_suppliers table
 */
export interface LegacySupplierRow {
  id: string;
  supplier_clean: string;
  supplier_id?: string;
  reason?: string;
  requires_review: boolean;
  reviewed_at?: string;
}

/**
 * Aggregated stats from legacy data
 */
export interface LegacyStats {
  totalSales: number;
  totalMargin: number;
  averageMargin: number;
  tradeCount: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

/**
 * Legacy data grouped by time period
 */
export interface LegacyDataByPeriod {
  period: string; // YYYY-MM format
  sales: number;
  margin: number;
  count: number;
}

/**
 * Legacy data grouped by category
 */
export interface LegacyDataByCategory {
  category: string;
  sales: number;
  margin: number;
  count: number;
  percentage: number;
}

/**
 * Top performer in legacy data
 */
export interface LegacyTopPerformer {
  name: string;
  value: number;
  count: number;
  type: "client" | "supplier" | "brand" | "category";
}
