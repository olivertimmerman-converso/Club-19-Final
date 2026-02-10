/**
 * Club 19 Sales OS - Legacy Data Utilities
 *
 * Server-side utilities for querying legacy trade data from database
 *
 * IMPORTANT: Legacy tables (legacy_trades, legacy_clients, legacy_suppliers)
 * must be created in the database before this module will work.
 * See: data/legacy-import/XATA_IMPORT_GUIDE.md
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

// ORIGINAL XATA:
// import { xata } from "@/lib/xata-sales";
// import type { LegacyTradesRecord, LegacyClientsRecord, LegacySuppliersRecord } from "@/src/xata";

// DRIZZLE IMPORTS
import { db } from "@/db";
import { legacyTrades, legacyClients, legacySuppliers } from "@/db/schema";
import { eq, desc, isNull } from "drizzle-orm";

import * as logger from "./logger";

// Legacy tables are now active in the database
const LEGACY_TABLES_EXIST = true;

export interface LegacySummary {
  totalSales: number;
  totalMargin: number;
  tradeCount: number;
  clientCount: number;
  supplierCount: number;
  avgMargin: number;
  dateRange: { start: string | null; end: string | null };
}

export interface MonthlySales {
  month: string;
  sales: number;
  margin: number;
  count: number;
}

export interface CategoryData {
  category: string;
  sales: number;
  margin: number;
  count: number;
}

export interface SupplierData {
  supplier: string;
  sales: number;
  margin: number;
  count: number;
}

export interface ClientData {
  client: string;
  sales: number;
  margin: number;
  count: number;
}

export interface LegacyTrade {
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
  source: string;
}

export interface ReviewFlags {
  clientsRequiringReview: number;
  suppliersRequiringReview: number;
  tradesWithoutDates: number;
  clientDetails: Array<{ client: string; reason: string }>;
  supplierDetails: Array<{ supplier: string; reason: string }>;
}

/**
 * Get overall legacy data summary
 */
export async function getLegacySummary(shopper?: "Hope" | "MC"): Promise<LegacySummary> {
  // Return empty data if tables don't exist yet
  if (!LEGACY_TABLES_EXIST) {
    return {
      totalSales: 0,
      totalMargin: 0,
      tradeCount: 0,
      clientCount: 0,
      supplierCount: 0,
      avgMargin: 0,
      dateRange: { start: null, end: null },
    };
  }

  try {
    logger.info("LEGACY_DATA", "getLegacySummary called");
    logger.info("LEGACY_DATA", "Shopper filter", { shopper: shopper || "(all)" } as any);

    // ORIGINAL XATA:
    // const filter = shopper ? { source: shopper } : {};
    // const trades = await xata().db.legacy_trades
    //   .filter(filter)
    //   .select(["sell_price", "margin", "trade_date"])
    //   .getAll();

    // DRIZZLE:
    let trades;
    if (shopper) {
      trades = await db
        .select({
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
          tradeDate: legacyTrades.tradeDate,
        })
        .from(legacyTrades)
        .where(eq(legacyTrades.source, shopper));
    } else {
      trades = await db
        .select({
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
          tradeDate: legacyTrades.tradeDate,
        })
        .from(legacyTrades);
    }

    logger.info("LEGACY_DATA", "Trades query returned", { count: trades.length });
    if (trades.length > 0) {
      logger.debug("LEGACY_DATA", "Sample trade", { trade: trades[0] as any });
    }

    // ORIGINAL XATA:
    // const clients = await xata().db.legacy_clients.getAll();
    // const suppliers = await xata().db.legacy_suppliers.getAll();

    // DRIZZLE:
    logger.info("LEGACY_DATA", "Fetching clients from legacy_clients table");
    const clients = await db.select().from(legacyClients);
    logger.info("LEGACY_DATA", "Clients query returned", { count: clients.length });

    logger.info("LEGACY_DATA", "Fetching suppliers from legacy_suppliers table");
    const suppliersResult = await db.select().from(legacySuppliers);
    logger.info("LEGACY_DATA", "Suppliers query returned", { count: suppliersResult.length });

    const totalSales = trades.reduce((sum: number, t) => sum + (t.sellPrice || 0), 0);
    const totalMargin = trades.reduce((sum: number, t) => sum + (t.margin || 0), 0);
    const avgMargin = trades.length > 0 ? totalMargin / trades.length : 0;

    // Get date range
    const dates = trades
      .map(t => t.tradeDate)
      .filter(Boolean)
      .map(d => d instanceof Date ? d.toISOString() : String(d))
      .sort();

    const summary: LegacySummary = {
      totalSales,
      totalMargin,
      tradeCount: trades.length,
      clientCount: shopper ? 0 : clients.length, // Don't count clients for shopper view
      supplierCount: shopper ? 0 : suppliersResult.length,
      avgMargin,
      dateRange: {
        start: dates[0] ? String(dates[0]) : null,
        end: dates[dates.length - 1] ? String(dates[dates.length - 1]) : null,
      },
    };

    logger.info("LEGACY_DATA", "Summary calculated", { summary: summary as any });
    logger.info("LEGACY_DATA", "getLegacySummary complete");
    return summary;
  } catch (error) {
    logger.error("LEGACY_DATA", "Error in getLegacySummary", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    } as any);
    logger.info("LEGACY_DATA", "Returning empty summary due to error");
    return {
      totalSales: 0,
      totalMargin: 0,
      tradeCount: 0,
      clientCount: 0,
      supplierCount: 0,
      avgMargin: 0,
      dateRange: { start: null, end: null },
    };
  }
}

/**
 * Get monthly sales over time
 */
export async function getLegacyMonthlySales(shopper?: "Hope" | "MC"): Promise<MonthlySales[]> {
  if (!LEGACY_TABLES_EXIST) return [];

  try {
    // ORIGINAL XATA:
    // const filter = shopper ? { source: shopper } : {};
    // const trades = await xata().db.legacy_trades
    //   .filter(filter)
    //   .select(["trade_date", "sell_price", "margin"])
    //   .getAll();

    // DRIZZLE:
    let trades;
    if (shopper) {
      trades = await db
        .select({
          tradeDate: legacyTrades.tradeDate,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades)
        .where(eq(legacyTrades.source, shopper));
    } else {
      trades = await db
        .select({
          tradeDate: legacyTrades.tradeDate,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades);
    }

    // Group by month
    const monthlyData = new Map<string, { sales: number; margin: number; count: number }>();

    trades.forEach(trade => {
      if (!trade.tradeDate) return;

      // Safely convert date to string and extract YYYY-MM
      let month: string;
      try {
        const dateValue = trade.tradeDate as string | Date;
        if (typeof dateValue === 'string') {
          month = dateValue.substring(0, 7); // YYYY-MM
        } else if (trade.tradeDate instanceof Date) {
          month = trade.tradeDate.toISOString().substring(0, 7); // YYYY-MM
        } else {
          // Fallback: try to convert to Date
          const date = new Date(trade.tradeDate);
          if (isNaN(date.getTime())) {
            logger.warn("LEGACY_DATA", "Invalid tradeDate in getLegacyMonthlySales", { tradeDate: trade.tradeDate });
            return;
          }
          month = date.toISOString().substring(0, 7);
        }
      } catch (err) {
        logger.error("LEGACY_DATA", "Error processing tradeDate in getLegacyMonthlySales", { error: err as any } as any);
        return;
      }

      const existing = monthlyData.get(month) || { sales: 0, margin: 0, count: 0 };

      monthlyData.set(month, {
        sales: existing.sales + (trade.sellPrice || 0),
        margin: existing.margin + (trade.margin || 0),
        count: existing.count + 1,
      });
    });

    // Convert to array and sort
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  } catch (error) {
    logger.error("LEGACY_DATA", "Error in getLegacyMonthlySales", { error: error as any } as any);
    return [];
  }
}

/**
 * Get sales by category
 */
export async function getLegacyByCategory(shopper?: "Hope" | "MC"): Promise<CategoryData[]> {
  if (!LEGACY_TABLES_EXIST) return [];

  try {
    // ORIGINAL XATA:
    // const filter = shopper ? { source: shopper } : {};
    // const trades = await xata().db.legacy_trades
    //   .filter(filter)
    //   .select(["category", "sell_price", "margin"])
    //   .getAll();

    // DRIZZLE:
    let trades;
    if (shopper) {
      trades = await db
        .select({
          category: legacyTrades.category,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades)
        .where(eq(legacyTrades.source, shopper));
    } else {
      trades = await db
        .select({
          category: legacyTrades.category,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades);
    }

    // Group by category
    const categoryData = new Map<string, { sales: number; margin: number; count: number }>();

    trades.forEach(trade => {
      const category = trade.category || "Unknown";
      const existing = categoryData.get(category) || { sales: 0, margin: 0, count: 0 };

      categoryData.set(category, {
        sales: existing.sales + (trade.sellPrice || 0),
        margin: existing.margin + (trade.margin || 0),
        count: existing.count + 1,
      });
    });

    // Convert to array and sort by sales
    return Array.from(categoryData.entries())
      .map(([category, data]) => ({
        category,
        ...data,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Top 10
  } catch (error) {
    logger.error("LEGACY_DATA", "Error in getLegacyByCategory", { error: error as any } as any);
    return [];
  }
}

/**
 * Get sales by supplier
 */
export async function getLegacyBySupplier(shopper?: "Hope" | "MC"): Promise<SupplierData[]> {
  if (!LEGACY_TABLES_EXIST) return [];

  try {
    // ORIGINAL XATA:
    // const filter = shopper ? { source: shopper } : {};
    // const trades = await xata().db.legacy_trades
    //   .filter(filter)
    //   .select(["raw_supplier", "sell_price", "margin"])
    //   .getAll();

    // DRIZZLE:
    let trades;
    if (shopper) {
      trades = await db
        .select({
          rawSupplier: legacyTrades.rawSupplier,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades)
        .where(eq(legacyTrades.source, shopper));
    } else {
      trades = await db
        .select({
          rawSupplier: legacyTrades.rawSupplier,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades);
    }

    // Group by supplier
    const supplierData = new Map<string, { sales: number; margin: number; count: number }>();

    trades.forEach(trade => {
      const supplier = trade.rawSupplier || "Unknown";
      const existing = supplierData.get(supplier) || { sales: 0, margin: 0, count: 0 };

      supplierData.set(supplier, {
        sales: existing.sales + (trade.sellPrice || 0),
        margin: existing.margin + (trade.margin || 0),
        count: existing.count + 1,
      });
    });

    // Convert to array and sort by sales
    return Array.from(supplierData.entries())
      .map(([supplier, data]) => ({
        supplier,
        ...data,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Top 10
  } catch (error) {
    logger.error("LEGACY_DATA", "Error in getLegacyBySupplier", { error: error as any } as any);
    return [];
  }
}

/**
 * Get top clients
 */
export async function getTopLegacyClients(shopper?: "Hope" | "MC"): Promise<ClientData[]> {
  if (!LEGACY_TABLES_EXIST) return [];

  try {
    // ORIGINAL XATA:
    // const filter = shopper ? { source: shopper } : {};
    // const trades = await xata().db.legacy_trades
    //   .filter(filter)
    //   .select(["raw_client", "sell_price", "margin"])
    //   .getAll();

    // DRIZZLE:
    let trades;
    if (shopper) {
      trades = await db
        .select({
          rawClient: legacyTrades.rawClient,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades)
        .where(eq(legacyTrades.source, shopper));
    } else {
      trades = await db
        .select({
          rawClient: legacyTrades.rawClient,
          sellPrice: legacyTrades.sellPrice,
          margin: legacyTrades.margin,
        })
        .from(legacyTrades);
    }

    // Group by client
    const clientData = new Map<string, { sales: number; margin: number; count: number }>();

    trades.forEach(trade => {
      const client = trade.rawClient || "Unknown";
      const existing = clientData.get(client) || { sales: 0, margin: 0, count: 0 };

      clientData.set(client, {
        sales: existing.sales + (trade.sellPrice || 0),
        margin: existing.margin + (trade.margin || 0),
        count: existing.count + 1,
      });
    });

    // Convert to array and sort by sales
    return Array.from(clientData.entries())
      .map(([client, data]) => ({
        client,
        ...data,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Top 10
  } catch (error) {
    logger.error("LEGACY_DATA", "Error in getTopLegacyClients", { error: error as any } as any);
    return [];
  }
}

/**
 * Get top suppliers
 */
export async function getTopLegacySuppliers(shopper?: "Hope" | "MC"): Promise<SupplierData[]> {
  // Same as getLegacyBySupplier
  return getLegacyBySupplier(shopper);
}

/**
 * Get recent trades
 */
export async function getRecentLegacyTrades(
  limit: number = 20,
  shopper?: "Hope" | "MC"
): Promise<LegacyTrade[]> {
  if (!LEGACY_TABLES_EXIST) return [];

  try {
    // ORIGINAL XATA:
    // const filter = shopper ? { source: shopper } : {};
    // const result = await xata().db.legacy_trades
    //   .filter(filter)
    //   .select([
    //     "id", "trade_date", "invoice_number", "raw_client", "raw_supplier",
    //     "item", "brand", "category", "buy_price", "sell_price", "margin", "source",
    //   ])
    //   .sort("trade_date", "desc")
    //   .getPaginated({ pagination: { size: limit } });

    // DRIZZLE:
    let trades;
    if (shopper) {
      trades = await db
        .select()
        .from(legacyTrades)
        .where(eq(legacyTrades.source, shopper))
        .orderBy(desc(legacyTrades.tradeDate))
        .limit(limit);
    } else {
      trades = await db
        .select()
        .from(legacyTrades)
        .orderBy(desc(legacyTrades.tradeDate))
        .limit(limit);
    }

    return trades.map((record): LegacyTrade => ({
      id: record.id,
      trade_date: record.tradeDate ? (record.tradeDate instanceof Date ? record.tradeDate.toISOString() : String(record.tradeDate)) : null,
      invoice_number: record.invoiceNumber || "",
      raw_client: record.rawClient || "",
      raw_supplier: record.rawSupplier || "",
      item: record.item || "",
      brand: record.brand || "",
      category: record.category || "",
      buy_price: record.buyPrice || 0,
      sell_price: record.sellPrice || 0,
      margin: record.margin || 0,
      source: record.source || "",
    }));
  } catch (error) {
    logger.error("LEGACY_DATA", "Error in getRecentLegacyTrades", { error: error as any } as any);
    return [];
  }
}

/**
 * Get review flags
 */
export async function getReviewFlags(): Promise<ReviewFlags> {
  if (!LEGACY_TABLES_EXIST) {
    return {
      clientsRequiringReview: 0,
      suppliersRequiringReview: 0,
      tradesWithoutDates: 0,
      clientDetails: [],
      supplierDetails: [],
    };
  }

  try {
    // ORIGINAL XATA:
    // const clients = await xata().db.legacy_clients
    //   .filter({ requires_review: true })
    //   .select(["client_clean"])
    //   .getAll();

    // DRIZZLE:
    const clients = await db
      .select({ clientClean: legacyClients.clientClean })
      .from(legacyClients)
      .where(eq(legacyClients.requiresReview, true));

    // ORIGINAL XATA:
    // const suppliers = await xata().db.legacy_suppliers
    //   .filter({ requires_review: true })
    //   .select(["supplier_clean", "reason"])
    //   .getAll();

    // DRIZZLE:
    const suppliersResult = await db
      .select({
        supplierClean: legacySuppliers.supplierClean,
        reason: legacySuppliers.reason,
      })
      .from(legacySuppliers)
      .where(eq(legacySuppliers.requiresReview, true));

    // ORIGINAL XATA:
    // const tradesWithoutDates = await xata().db.legacy_trades
    //   .filter({ trade_date: null })
    //   .select(["id"])
    //   .getAll();

    // DRIZZLE:
    const tradesWithoutDates = await db
      .select({ id: legacyTrades.id })
      .from(legacyTrades)
      .where(isNull(legacyTrades.tradeDate));

    return {
      clientsRequiringReview: clients.length,
      suppliersRequiringReview: suppliersResult.length,
      tradesWithoutDates: tradesWithoutDates.length,
      clientDetails: clients.map(c => ({
        client: c.clientClean || "Unknown",
        reason: "Status conflict",
      })),
      supplierDetails: suppliersResult.map(s => ({
        supplier: s.supplierClean || "Unknown",
        reason: s.reason || "Requires review",
      })),
    };
  } catch (error) {
    logger.error("LEGACY_DATA", "Error in getReviewFlags", { error: error as any } as any);
    return {
      clientsRequiringReview: 0,
      suppliersRequiringReview: 0,
      tradesWithoutDates: 0,
      clientDetails: [],
      supplierDetails: [],
    };
  }
}

/**
 * Get trades for specific shopper
 */
export async function getTradesForShopper(shopper: "Hope" | "MC"): Promise<LegacyTrade[]> {
  if (!LEGACY_TABLES_EXIST) return [];
  return getRecentLegacyTrades(1000, shopper); // Get all trades for shopper
}
