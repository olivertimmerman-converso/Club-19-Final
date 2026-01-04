/**
 * Debug script to check deleted_at values for sales records
 * Run with: npx tsx scripts/debug-deleted-sales.ts
 */

import { getXataClient } from '../src/xata';

async function main() {
  const xata = getXataClient();

  console.log('\n=== Checking Sales Records ===\n');

  // Get all sales with INV-3221 or INV-3219
  const sales = await xata.db.Sales
    .filter({
      $any: [
        { sale_reference: 'INV-3221' },
        { sale_reference: 'INV-3219' }
      ]
    })
    .select(['id', 'sale_reference', 'invoice_status', 'deleted_at', 'source'])
    .getAll();

  console.log(`Found ${sales.length} sales:\n`);

  for (const sale of sales) {
    console.log(`Sale: ${sale.sale_reference}`);
    console.log(`  ID: ${sale.id}`);
    console.log(`  invoice_status: ${sale.invoice_status}`);
    console.log(`  deleted_at: ${sale.deleted_at}`);
    console.log(`  source: ${sale.source}`);
    console.log(`  Should appear in Active? ${!sale.deleted_at ? 'YES' : 'NO'}`);
    console.log(`  Should appear in Deleted? ${sale.deleted_at ? 'YES' : 'NO'}`);
    console.log('');
  }

  // Check counts
  const activeCount = await xata.db.Sales
    .filter({
      $all: [
        { source: { $isNot: 'xero_import' } },
        { deleted_at: { $is: null } }
      ]
    })
    .summarize({
      columns: [],
      summaries: {
        count: { count: '*' }
      }
    });

  const deletedCount = await xata.db.Sales
    .filter({
      $all: [
        { source: { $isNot: 'xero_import' } },
        { deleted_at: { $isNot: null } }
      ]
    })
    .summarize({
      columns: [],
      summaries: {
        count: { count: '*' }
      }
    });

  console.log('\n=== Overall Counts ===');
  console.log(`Active sales (deleted_at IS NULL): ${activeCount.summaries[0].count}`);
  console.log(`Deleted sales (deleted_at IS NOT NULL): ${deletedCount.summaries[0].count}`);
}

main().catch(console.error);
