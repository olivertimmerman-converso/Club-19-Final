/**
 * Consolidate duplicate shopper records
 *
 * Merges partial names into full names:
 * - "Oliver" → "Oliver Timmerman"
 * - "Sophie" → "Sophie Timmerman"
 * - "Alys" → "Alys McMahon"
 * - "MC" → "Mary Clair"
 *
 * Also updates "Hope" to "Hope Sherwin" if needed
 *
 * Run with: npx tsx scripts/consolidate-shoppers.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { shoppers, sales } from '../db/schema';
import { eq } from 'drizzle-orm';

// ORIGINAL XATA: const xata = getXataClient();

// Define the merge mappings: source (partial name) → target (full name)
const MERGE_MAPPINGS = [
  {
    source: { id: 'rec_d4ra78ouignf32792c0g', name: 'Oliver' },
    target: { id: 'rec_d5dcpr4gmio87vvgjfrg', name: 'Oliver Timmerman' },
  },
  {
    source: { id: 'rec_d5b65p985bnc3iim75ig', name: 'Sophie' },
    target: { id: 'rec_d5f8ge185bnc3iimhhh0', name: 'Sophie Timmerman' },
  },
  {
    source: { id: 'rec_d5b669p85bnc3iim75j0', name: 'Alys' },
    target: { id: 'rec_d5fomi59l8q5imgqp9v0', name: 'Alys McMahon' },
  },
  {
    source: { id: 'rec_d4u06nouignf32792me0', name: 'MC' },
    target: { id: 'rec_d5dt9i185bnc3iimglfg', name: 'Mary Clair' },
  },
];

async function consolidateShoppers() {
  console.log('=== Shopper Consolidation Script ===\n');

  // First, show current state
  console.log('Current shoppers in database:\n');
  // ORIGINAL XATA: const allShoppers = await xata.db.Shoppers.select(['id', 'name', 'email', 'active']).getAll();
  const allShoppers = await db
    .select({
      id: shoppers.id,
      name: shoppers.name,
      email: shoppers.email,
      active: shoppers.active,
    })
    .from(shoppers);
  allShoppers.forEach(s => {
    console.log(`  "${s.name}" (ID: ${s.id}) - Email: ${s.email || 'none'}`);
  });

  console.log('\n--- Starting Merge Operations ---\n');

  for (const mapping of MERGE_MAPPINGS) {
    console.log(`\nMerging "${mapping.source.name}" → "${mapping.target.name}"`);
    console.log(`  Source ID: ${mapping.source.id}`);
    console.log(`  Target ID: ${mapping.target.id}`);

    // Verify both records exist
    // ORIGINAL XATA: const sourceRecord = await xata.db.Shoppers.read(mapping.source.id);
    // ORIGINAL XATA: const targetRecord = await xata.db.Shoppers.read(mapping.target.id);
    const sourceResults = await db.select().from(shoppers).where(eq(shoppers.id, mapping.source.id)).limit(1);
    const targetResults = await db.select().from(shoppers).where(eq(shoppers.id, mapping.target.id)).limit(1);
    const sourceRecord = sourceResults[0] || null;
    const targetRecord = targetResults[0] || null;

    if (!sourceRecord) {
      console.log(`  ⚠️  Source record not found - skipping (may already be merged)`);
      continue;
    }

    if (!targetRecord) {
      console.log(`  ❌ Target record not found - cannot merge!`);
      continue;
    }

    // Find all sales assigned to the source shopper
    // ORIGINAL XATA: const salesToUpdate = await xata.db.Sales
    //   .filter({ 'shopper.id': mapping.source.id })
    //   .select(['id', 'sale_reference', 'sale_date', 'sale_amount_inc_vat'])
    //   .getAll();
    const salesToUpdate = await db
      .select({
        id: sales.id,
        saleReference: sales.saleReference,
        saleDate: sales.saleDate,
        saleAmountIncVat: sales.saleAmountIncVat,
      })
      .from(sales)
      .where(eq(sales.shopperId, mapping.source.id));

    console.log(`  Found ${salesToUpdate.length} sales to reassign`);

    if (salesToUpdate.length > 0) {
      // Update each sale to point to the target shopper
      for (const sale of salesToUpdate) {
        // ORIGINAL XATA: await xata.db.Sales.update(sale.id, { shopper: mapping.target.id });
        await db
          .update(sales)
          .set({ shopperId: mapping.target.id })
          .where(eq(sales.id, sale.id));
        console.log(`    ✓ Updated sale ${sale.saleReference || sale.id}`);
      }
    }

    // Copy email from source to target if target has no email
    if (sourceRecord.email && !targetRecord.email) {
      // ORIGINAL XATA: await xata.db.Shoppers.update(mapping.target.id, { email: sourceRecord.email });
      await db
        .update(shoppers)
        .set({ email: sourceRecord.email })
        .where(eq(shoppers.id, mapping.target.id));
      console.log(`  ✓ Copied email "${sourceRecord.email}" to target`);
    }

    // Delete the source record
    // ORIGINAL XATA: await xata.db.Shoppers.delete(mapping.source.id);
    await db.delete(shoppers).where(eq(shoppers.id, mapping.source.id));
    console.log(`  ✓ Deleted source record "${mapping.source.name}"`);
  }

  // Final state
  console.log('\n\n=== Final Shoppers After Consolidation ===\n');
  // ORIGINAL XATA: const finalShoppers = await xata.db.Shoppers.select(['id', 'name', 'email', 'active']).getAll();
  const finalShoppers = await db
    .select({
      id: shoppers.id,
      name: shoppers.name,
      email: shoppers.email,
      active: shoppers.active,
    })
    .from(shoppers);
  finalShoppers.forEach(s => {
    console.log(`  "${s.name}" (ID: ${s.id}) - Email: ${s.email || 'none'}`);
  });

  // Verify sales assignments
  console.log('\n=== Sales by Shopper ===\n');
  // ORIGINAL XATA: const allSales = await xata.db.Sales
  //   .select(['id', 'shopper.id', 'shopper.name'])
  //   .getAll();
  const allSales = await db.query.sales.findMany({
    columns: { id: true },
    with: {
      shopper: {
        columns: { id: true, name: true }
      }
    }
  });

  const salesByShopperId = new Map<string, { name: string; count: number }>();
  allSales.forEach(sale => {
    if (sale.shopper?.id) {
      const key = sale.shopper.id;
      if (!salesByShopperId.has(key)) {
        salesByShopperId.set(key, { name: sale.shopper.name || 'Unknown', count: 0 });
      }
      salesByShopperId.get(key)!.count++;
    }
  });

  Array.from(salesByShopperId.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([id, data]) => {
      console.log(`  ${data.name}: ${data.count} sales`);
    });

  console.log('\n✅ Consolidation complete!');
  process.exit(0);
}

consolidateShoppers().catch(err => {
  console.error(err);
  process.exit(1);
});
