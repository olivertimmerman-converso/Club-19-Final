/**
 * Merge duplicate shopper records
 * This script merges shoppers with similar names (e.g., extra spaces)
 */

import { getXataClient } from '../src/xata';

const xata = getXataClient();

async function mergeDuplicateShoppers() {
  console.log('Fetching all shoppers...\n');

  const shoppers = await xata.db.Shoppers
    .select(['id', 'name', 'email'])
    .getAll();

  console.log(`Total shoppers: ${shoppers.length}\n`);

  // Find "Oliver Timmerman" vs "Oliver  Timmerman" (with extra space)
  const oliverNormal = shoppers.find(s => s.id === 'rec_d4ra78ouignf32792c0g');
  const oliverDuplicate = shoppers.find(s => s.id === 'rec_d4nhelthiahk7ipss5lg');

  if (!oliverNormal || !oliverDuplicate) {
    console.log('Could not find both Oliver Timmerman records');
    return;
  }

  console.log('Found duplicate Oliver Timmerman records:');
  console.log(`  Keep: "${oliverNormal.name}" (ID: ${oliverNormal.id}) - 2 sales`);
  console.log(`  Merge: "${oliverDuplicate.name}" (ID: ${oliverDuplicate.id}) - 1 sales\n`);

  // Get sales for the duplicate shopper
  const salesToUpdate = await xata.db.Sales
    .filter({ 'shopper.id': oliverDuplicate.id })
    .select(['id', 'sale_date', 'sale_amount_inc_vat'])
    .getAll();

  console.log(`Found ${salesToUpdate.length} sales to reassign:\n`);
  salesToUpdate.forEach(sale => {
    console.log(`  - Sale ${sale.id}: £${sale.sale_amount_inc_vat} on ${sale.sale_date}`);
  });

  console.log('\nReassigning sales to the main Oliver Timmerman record...');

  // Update each sale to point to the main shopper record
  for (const sale of salesToUpdate) {
    await xata.db.Sales.update(sale.id, {
      shopper: oliverNormal.id,
    });
    console.log(`  ✓ Updated sale ${sale.id}`);
  }

  console.log('\nDeleting duplicate shopper record...');
  await xata.db.Shoppers.delete(oliverDuplicate.id);
  console.log(`  ✓ Deleted duplicate shopper ${oliverDuplicate.id}\n`);

  console.log('✓ Merge complete! All sales now assigned to single Oliver Timmerman record');
  console.log(`  Final shopper: "${oliverNormal.name}" (ID: ${oliverNormal.id})`);
}

mergeDuplicateShoppers().catch(console.error);
