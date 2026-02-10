/**
 * Analyze legacy data tables
 *
 * Run with: npx tsx scripts/analyze-legacy.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata.js';
import { db } from '../db';
import { legacyTrades, legacyClients, legacySuppliers, sales } from '../db/schema';

async function analyzeLegacy() {
  // ORIGINAL XATA: const xata = getXataClient();

  try {
    // Count records in each legacy table
    // ORIGINAL XATA: const trades = await xata.db.legacy_trades.getAll();
    // ORIGINAL XATA: const clients = await xata.db.legacy_clients.getAll();
    // ORIGINAL XATA: const suppliers = await xata.db.legacy_suppliers.getAll();
    const trades = await db.select().from(legacyTrades);
    const clients = await db.select().from(legacyClients);
    const suppliers = await db.select().from(legacySuppliers);

    console.log('=== RECORD COUNTS ===');
    console.log('legacy_trades:', trades.length);
    console.log('legacy_clients:', clients.length);
    console.log('legacy_suppliers:', suppliers.length);
    console.log('');

    // Date range of trades
    if (trades.length > 0) {
      const dates = trades
        .map(t => t.tradeDate)
        .filter((d): d is Date => d !== null && d !== undefined)
        .map(d => new Date(d).getTime())
        .sort((a, b) => a - b);

      if (dates.length > 0) {
        console.log('=== DATE RANGE ===');
        console.log('Earliest:', new Date(dates[0]).toISOString().split('T')[0]);
        console.log('Latest:', new Date(dates[dates.length - 1]).toISOString().split('T')[0]);
        console.log('');
      }
    }

    // Sample records
    console.log('=== SAMPLE TRADES (first 5) ===');
    trades.slice(0, 5).forEach((trade, i) => {
      console.log(`Trade ${i + 1}:`);
      console.log('  ID:', trade.id);
      console.log('  Date:', trade.tradeDate);
      console.log('  Brand:', trade.brand || 'null');
      console.log('  Item:', trade.itemTitle || 'null');
      console.log('  Sale Amount:', trade.saleAmountIncVat);
      console.log('  Margin:', trade.grossMargin);
      console.log('  Client ID:', trade.legacyClientId || 'null');
      console.log('  Supplier ID:', trade.legacySupplierId || 'null');
      console.log('');
    });

    // Sales table comparison
    // ORIGINAL XATA: const sales = await xata.db.Sales.getAll();
    const allSales = await db.select().from(sales);
    console.log('=== SALES TABLE COMPARISON ===');
    console.log('Total Sales records:', allSales.length);

    const unknownBrand = allSales.filter(s => !s.brand || s.brand === 'Unknown').length;
    const withBrand = allSales.filter(s => s.brand && s.brand !== 'Unknown').length;
    const withMargin = allSales.filter(s => s.grossMargin !== null && s.grossMargin !== undefined && Number(s.grossMargin) > 0).length;

    console.log('Sales with Unknown/null brand:', unknownBrand);
    console.log('Sales with valid brand:', withBrand);
    console.log('Sales with margin data:', withMargin);
    console.log('');

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

analyzeLegacy();
