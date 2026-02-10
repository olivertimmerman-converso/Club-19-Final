/**
 * Delete duplicate "Oliver Timmerman" shopper
 *
 * Keeps "Oliver" and removes "Oliver Timmerman"
 * Reassigns any linked sales to "Oliver" first
 *
 * Run with: npx tsx scripts/delete-duplicate-shopper.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { shoppers, sales } from '../db/schema';
import { eq, or } from 'drizzle-orm';

async function main() {
  // ORIGINAL XATA: const xata = getXataClient();

  // Find both shopper records
  // ORIGINAL XATA: const shoppers = await xata.db.Shoppers
  //   .filter({
  //     $any: [
  //       { name: 'Oliver' },
  //       { name: 'Oliver Timmerman' }
  //     ]
  //   })
  //   .getAll();
  const matchingShoppers = await db
    .select()
    .from(shoppers)
    .where(
      or(
        eq(shoppers.name, 'Oliver'),
        eq(shoppers.name, 'Oliver Timmerman')
      )
    );

  console.log('\n=== Found Shoppers ===');
  matchingShoppers.forEach(s => {
    console.log(`- "${s.name}" (ID: ${s.id})`);
  });

  const oliverRecord = matchingShoppers.find(s => s.name === 'Oliver');
  const oliverTimmermanRecord = matchingShoppers.find(s => s.name === 'Oliver Timmerman');

  if (!oliverRecord) {
    console.error('\n❌ ERROR: "Oliver" shopper not found!');
    process.exit(1);
  }

  if (!oliverTimmermanRecord) {
    console.log('\n✓ "Oliver Timmerman" shopper not found - nothing to delete');
    process.exit(0);
  }

  console.log(`\n✓ Keeping: "${oliverRecord.name}" (${oliverRecord.id})`);
  console.log(`✗ Deleting: "${oliverTimmermanRecord.name}" (${oliverTimmermanRecord.id})`);

  // Check for any sales linked to "Oliver Timmerman"
  // ORIGINAL XATA: const linkedSales = await xata.db.Sales
  //   .filter({ 'shopper.id': oliverTimmermanRecord.id })
  //   .select(['id', 'sale_reference', 'shopper.name'])
  //   .getAll();
  const linkedSales = await db
    .select({
      id: sales.id,
      saleReference: sales.saleReference,
    })
    .from(sales)
    .where(eq(sales.shopperId, oliverTimmermanRecord.id));

  console.log(`\n=== Sales linked to "${oliverTimmermanRecord.name}" ===`);
  if (linkedSales.length === 0) {
    console.log('None');
  } else {
    console.log(`Found ${linkedSales.length} sales to reassign:`);
    linkedSales.forEach(s => {
      console.log(`  - ${s.saleReference || s.id}`);
    });

    // Reassign all sales to "Oliver"
    console.log(`\nReassigning ${linkedSales.length} sales to "${oliverRecord.name}"...`);
    for (const sale of linkedSales) {
      // ORIGINAL XATA: await xata.db.Sales.update(sale.id, { shopper: oliverRecord.id });
      await db
        .update(sales)
        .set({ shopperId: oliverRecord.id })
        .where(eq(sales.id, sale.id));
      console.log(`  ✓ Reassigned ${sale.saleReference || sale.id}`);
    }
  }

  // Delete "Oliver Timmerman" shopper
  console.log(`\nDeleting "${oliverTimmermanRecord.name}" shopper...`);
  // ORIGINAL XATA: await xata.db.Shoppers.delete(oliverTimmermanRecord.id);
  await db.delete(shoppers).where(eq(shoppers.id, oliverTimmermanRecord.id));
  console.log('✓ Deleted successfully');

  console.log('\n=== Summary ===');
  console.log(`Kept: "${oliverRecord.name}" (${oliverRecord.id})`);
  console.log(`Deleted: "${oliverTimmermanRecord.name}" (${oliverTimmermanRecord.id})`);
  console.log(`Reassigned sales: ${linkedSales.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
