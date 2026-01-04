/**
 * Delete duplicate "Oliver Timmerman" shopper
 *
 * Keeps "Oliver" and removes "Oliver Timmerman"
 * Reassigns any linked sales to "Oliver" first
 */

import { getXataClient } from '../src/xata';

async function main() {
  const xata = getXataClient();

  // Find both shopper records
  const shoppers = await xata.db.Shoppers
    .filter({
      $any: [
        { name: 'Oliver' },
        { name: 'Oliver Timmerman' }
      ]
    })
    .getAll();

  console.log('\n=== Found Shoppers ===');
  shoppers.forEach(s => {
    console.log(`- "${s.name}" (ID: ${s.id})`);
  });

  const oliverRecord = shoppers.find(s => s.name === 'Oliver');
  const oliverTimmermanRecord = shoppers.find(s => s.name === 'Oliver Timmerman');

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
  const linkedSales = await xata.db.Sales
    .filter({ 'shopper.id': oliverTimmermanRecord.id })
    .select(['id', 'sale_reference', 'shopper.name'])
    .getAll();

  console.log(`\n=== Sales linked to "${oliverTimmermanRecord.name}" ===`);
  if (linkedSales.length === 0) {
    console.log('None');
  } else {
    console.log(`Found ${linkedSales.length} sales to reassign:`);
    linkedSales.forEach(s => {
      console.log(`  - ${s.sale_reference || s.id}`);
    });

    // Reassign all sales to "Oliver"
    console.log(`\nReassigning ${linkedSales.length} sales to "${oliverRecord.name}"...`);
    for (const sale of linkedSales) {
      await xata.db.Sales.update(sale.id, {
        shopper: oliverRecord.id
      });
      console.log(`  ✓ Reassigned ${sale.sale_reference || sale.id}`);
    }
  }

  // Delete "Oliver Timmerman" shopper
  console.log(`\nDeleting "${oliverTimmermanRecord.name}" shopper...`);
  await xata.db.Shoppers.delete(oliverTimmermanRecord.id);
  console.log('✓ Deleted successfully');

  console.log('\n=== Summary ===');
  console.log(`Kept: "${oliverRecord.name}" (${oliverRecord.id})`);
  console.log(`Deleted: "${oliverTimmermanRecord.name}" (${oliverTimmermanRecord.id})`);
  console.log(`Reassigned sales: ${linkedSales.length}`);
}

main().catch(console.error);
