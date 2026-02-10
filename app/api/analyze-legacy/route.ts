/**
 * Club 19 Sales OS - Analyze Legacy Data API
 *
 * GET endpoint to analyze legacy tables and provide statistics
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextResponse } from 'next/server';

// Drizzle imports
import { db } from "@/db";
import { sales, legacyTrades, legacyClients, legacySuppliers } from "@/db/schema";
import { isNotNull, and, ne, gt } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from '@/src/xata';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // ORIGINAL XATA:
    // const xata = getXataClient();
    // const trades = await xata.db.legacy_trades.getAll();
    // const clients = await xata.db.legacy_clients.getAll();
    // const suppliers = await xata.db.legacy_suppliers.getAll();

    // DRIZZLE:
    // Count records in each legacy table
    const trades = await db.select().from(legacyTrades);
    const clients = await db.select().from(legacyClients);
    const legacySuppliersList = await db.select().from(legacySuppliers);

    // Date range of trades
    let dateRange = { earliest: null as string | null, latest: null as string | null };
    if (trades.length > 0) {
      const dates = trades
        .map(t => t.tradeDate)
        .filter(d => d !== null && d !== undefined)
        .map(d => new Date(d as Date).getTime())
        .sort((a, b) => a - b);

      if (dates.length > 0) {
        dateRange = {
          earliest: new Date(dates[0]).toISOString().split('T')[0],
          latest: new Date(dates[dates.length - 1]).toISOString().split('T')[0],
        };
      }
    }

    // Sample records
    const sampleTrades = trades.slice(0, 5).map(trade => ({
      id: trade.id,
      trade_date: trade.tradeDate,
      brand: trade.brand || 'null',
      item: trade.item || 'null',
      sell_price: trade.sellPrice,
      margin: trade.margin,
      client_id: trade.clientId || 'null',
      supplier_id: trade.supplierId || 'null',
    }));

    // ORIGINAL XATA:
    // const sales = await xata.db.Sales.getAll();

    // DRIZZLE:
    // Sales table comparison
    const salesData = await db.select().from(sales);

    const unknownBrand = salesData.filter(s => !s.brand || s.brand === 'Unknown').length;
    const withBrand = salesData.filter(s => s.brand && s.brand !== 'Unknown').length;
    const withMargin = salesData.filter(s => s.grossMargin !== null && s.grossMargin !== undefined && s.grossMargin > 0).length;

    return NextResponse.json({
      recordCounts: {
        legacy_trades: trades.length,
        legacy_clients: clients.length,
        legacy_suppliers: legacySuppliersList.length,
      },
      dateRange,
      sampleTrades,
      salesComparison: {
        totalSales: salesData.length,
        unknownBrand,
        withBrand,
        withMargin,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
