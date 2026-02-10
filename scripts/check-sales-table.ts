/**
 * Check Sales table to verify database connectivity and data
 *
 * Run with: npx tsx scripts/check-sales-table.ts
 */

// ORIGINAL XATA: import { XataClient } from '../src/xata';
import { db } from '../db';
import { sales } from '../db/schema';
import { desc, isNotNull } from 'drizzle-orm';

// ORIGINAL XATA:
// const xata = new XataClient({
//   apiKey: process.env.XATA_API_KEY || '',
//   databaseURL: process.env.XATA_DATABASE_URL || '',
//   branch: process.env.XATA_BRANCH || 'main'
// });

async function checkSales() {
  try {
    console.log('[SALES CHECK] Querying Sales table...');

    // ORIGINAL XATA: const records = await xata.db.Sales
    //   .select([...])
    //   .sort('xata.createdAt', 'desc')
    //   .getAll();
    const records = await db
      .select({
        id: sales.id,
        createdAt: sales.createdAt,
        saleReference: sales.saleReference,
        xeroInvoiceNumber: sales.xeroInvoiceNumber,
        buyerId: sales.buyerId,
        brand: sales.brand,
        itemTitle: sales.itemTitle,
        quantity: sales.quantity,
        saleAmountIncVat: sales.saleAmountIncVat,
        saleAmountExVat: sales.saleAmountExVat,
        buyPrice: sales.buyPrice,
        currency: sales.currency,
        xeroInvoiceId: sales.xeroInvoiceId,
        xeroInvoiceUrl: sales.xeroInvoiceUrl,
      })
      .from(sales)
      .orderBy(desc(sales.createdAt));

    console.log(`[SALES CHECK] Found ${records.length} records\n`);

    if (records.length === 0) {
      console.log('❌ NO RECORDS FOUND - Sales table is empty!');
      console.log('This means Deal Studio is creating Xero invoices but NOT saving to database.');
      return;
    }

    records.forEach((record, idx) => {
      console.log(`--- Record ${idx + 1} ---`);
      console.log(`Created: ${record.createdAt}`);
      console.log(`Invoice: ${record.xeroInvoiceNumber || 'N/A'}`);
      console.log(`Buyer ID: ${record.buyerId || 'N/A'}`);
      console.log(`Item: ${record.brand || 'N/A'} - ${record.itemTitle || 'N/A'}`);
      console.log(`Amount: ${record.currency || 'GBP'} ${record.saleAmountIncVat || 0}`);
      console.log(`Xero ID: ${record.xeroInvoiceId || 'N/A'}`);
      console.log('');
    });

    // Check specifically for INV-3170
    const inv3170 = records.find(r => r.xeroInvoiceNumber === 'INV-3170');
    if (inv3170) {
      console.log('✅ FOUND INV-3170 (Hermès B25, Bettina Looney)');
    } else {
      console.log('❌ INV-3170 NOT FOUND in Sales table');
      console.log('This confirms Deal Studio does NOT save to database after creating Xero invoice.');
    }

  } catch (error: any) {
    console.error('[SALES CHECK] Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

checkSales();
