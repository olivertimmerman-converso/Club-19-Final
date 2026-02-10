/**
 * Merge duplicate shopper records
 * This script merges shoppers with similar names (e.g., extra spaces)
 *
 * Run with: npx tsx scripts/merge-duplicate-shoppers.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { shoppers, sales } from '../db/schema';
import { eq } from 'drizzle-orm';

// ORIGINAL XATA: const xata = getXataClient();

async function mergeDuplicateShoppers() {
  console.log('Fetching all shoppers...\n');

  // ORIGINAL XATA: const shoppers = await xata.db.Shoppers
  //   .select(['id', 'name', 'email'])
  //   .getAll();
  const allShoppers = await db
    .select({
      id: shoppers.id,
      name: shoppers.name,
      email: shoppers.email,
    })
    .from(shoppers);

  console.log(`Total shoppers: ${allShoppers.length}\n`);

  // Find "Oliver Timmerman" vs "Oliver  Timmerman" (with extra space)
  const oliverNormal = allShoppers.find(s => s.id === 'rec_d4ra78ouignf32792c0g');
  const oliverDuplicate = allShoppers.find(s => s.id === 'rec_d4nhelthiahk7ipss5lg');

  if (!oliverNormal || !oliverDuplicate) {
    console.log('Could not find both Oliver Timmerman records');
    process.exit(0);
    return;
  }

  console.log('Found duplicate Oliver Timmerman records:');
  console.log(`  Keep: "${oliverNormal.name}" (ID: ${oliverNormal.id}) - 2 sales`);
  console.log(`  Merge: "${oliverDuplicate.name}" (ID: ${oliverDuplicate.id}) - 1 sales\n`);

  // Get sales for the duplicate shopper
  // ORIGINAL XATA: const salesToUpdate = await xata.db.Sales
  //   .filter({ 'shopper.id': oliverDuplicate.id })
  //   .select(['id', 'sale_date', 'sale_amount_inc_vat'])
  //   .getAll();
  const salesToUpdate = await db
    .select({
      id: sales.id,
      saleDate: sales.saleDate,
      saleAmountIncVat: sales.saleAmountIncVat,
    })
    .from(sales)
    .where(eq(sales.shopperId, oliverDuplicate.id));

  console.log(`Found ${salesToUpdate.length} sales to reassign:\n`);
  salesToUpdate.forEach(sale => {
    console.log(`  - Sale ${sale.id}: £${sale.saleAmountIncVat} on ${sale.saleDate}`);
  });

  console.log('\nReassigning sales to the main Oliver Timmerman record...');

  // Update each sale to point to the main shopper record
  for (const sale of salesToUpdate) {
    // ORIGINAL XATA: await xata.db.Sales.update(sale.id, { shopper: oliverNormal.id });
    await db
      .update(sales)
      .set({ shopperId: oliverNormal.id })
      .where(eq(sales.id, sale.id));
    console.log(`  ✓ Updated sale ${sale.id}`);
  }

  console.log('\nDeleting duplicate shopper record...');
  // ORIGINAL XATA: await xata.db.Shoppers.delete(oliverDuplicate.id);
  await db.delete(shoppers).where(eq(shoppers.id, oliverDuplicate.id));
  console.log(`  ✓ Deleted duplicate shopper ${oliverDuplicate.id}\n`);

  console.log('✓ Merge complete! All sales now assigned to single Oliver Timmerman record');
  console.log(`  Final shopper: "${oliverNormal.name}" (ID: ${oliverNormal.id})`);

  process.exit(0);
}

mergeDuplicateShoppers().catch(err => {
  console.error(err);
  process.exit(1);
});
