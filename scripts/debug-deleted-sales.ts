/**
 * Debug script to check deleted_at values for sales records
 * Run with: npx tsx scripts/debug-deleted-sales.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { sales } from '../db/schema';
import { or, eq, and, ne, isNull, isNotNull, count } from 'drizzle-orm';

async function main() {
  // ORIGINAL XATA: const xata = getXataClient();

  console.log('\n=== Checking Sales Records ===\n');

  // Get all sales with INV-3221 or INV-3219
  // ORIGINAL XATA: const sales = await xata.db.Sales
  //   .filter({
  //     $any: [
  //       { sale_reference: 'INV-3221' },
  //       { sale_reference: 'INV-3219' }
  //     ]
  //   })
  //   .select(['id', 'sale_reference', 'invoice_status', 'deleted_at', 'source'])
  //   .getAll();
  const matchingSales = await db
    .select({
      id: sales.id,
      saleReference: sales.saleReference,
      invoiceStatus: sales.invoiceStatus,
      deletedAt: sales.deletedAt,
      source: sales.source,
    })
    .from(sales)
    .where(
      or(
        eq(sales.saleReference, 'INV-3221'),
        eq(sales.saleReference, 'INV-3219')
      )
    );

  console.log(`Found ${matchingSales.length} sales:\n`);

  for (const sale of matchingSales) {
    console.log(`Sale: ${sale.saleReference}`);
    console.log(`  ID: ${sale.id}`);
    console.log(`  invoice_status: ${sale.invoiceStatus}`);
    console.log(`  deleted_at: ${sale.deletedAt}`);
    console.log(`  source: ${sale.source}`);
    console.log(`  Should appear in Active? ${!sale.deletedAt ? 'YES' : 'NO'}`);
    console.log(`  Should appear in Deleted? ${sale.deletedAt ? 'YES' : 'NO'}`);
    console.log('');
  }

  // Check counts
  // ORIGINAL XATA: const activeCount = await xata.db.Sales
  //   .filter({
  //     $all: [
  //       { source: { $isNot: 'xero_import' } },
  //       { deleted_at: { $is: null } }
  //     ]
  //   })
  //   .summarize({
  //     columns: [],
  //     summaries: { count: { count: '*' } }
  //   });
  const activeCountResult = await db
    .select({ count: count() })
    .from(sales)
    .where(
      and(
        ne(sales.source, 'xero_import'),
        isNull(sales.deletedAt)
      )
    );

  // ORIGINAL XATA: const deletedCount = await xata.db.Sales
  //   .filter({
  //     $all: [
  //       { source: { $isNot: 'xero_import' } },
  //       { deleted_at: { $isNot: null } }
  //     ]
  //   })
  //   .summarize({
  //     columns: [],
  //     summaries: { count: { count: '*' } }
  //   });
  const deletedCountResult = await db
    .select({ count: count() })
    .from(sales)
    .where(
      and(
        ne(sales.source, 'xero_import'),
        isNotNull(sales.deletedAt)
      )
    );

  console.log('\n=== Overall Counts ===');
  console.log(`Active sales (deleted_at IS NULL): ${activeCountResult[0]?.count || 0}`);
  console.log(`Deleted sales (deleted_at IS NOT NULL): ${deletedCountResult[0]?.count || 0}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
