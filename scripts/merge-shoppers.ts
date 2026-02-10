/**
 * Script to merge duplicate shopper records
 *
 * Usage: npx tsx scripts/merge-shoppers.ts
 *
 * This script will:
 * 1. Find both Mary Clair shopper records
 * 2. Show all linked Sales and Buyers
 * 3. Display the merge plan
 * 4. Wait for confirmation before executing
 */

import { config } from 'dotenv';
// ORIGINAL XATA: import { XataClient } from '../src/xata';
import { db } from '../db';
import { shoppers, sales, buyers } from '../db/schema';
import { eq, like } from 'drizzle-orm';

// Load .env.local
config({ path: '.env.local' });

// ORIGINAL XATA:
// const xata = new XataClient({
//   apiKey: process.env.XATA_API_KEY,
//   branch: process.env.XATA_BRANCH || 'main',
// });

async function main() {
  console.log('\n=== MERGE DUPLICATE SHOPPERS ===\n');

  // Step 1: Find both shopper records
  console.log('Step 1: Finding shopper records...\n');

  // ORIGINAL XATA: const shoppers = await xata.db.Shoppers
  //   .filter({ $any: [{ name: { $contains: 'Mary Clair' } }] })
  //   .getAll();
  const matchingShoppers = await db
    .select()
    .from(shoppers)
    .where(like(shoppers.name, '%Mary Clair%'));

  if (matchingShoppers.length === 0) {
    console.log('No shoppers found matching "Mary Clair"');
    process.exit(0);
    return;
  }

  console.log('Found shoppers:');
  matchingShoppers.forEach(s => {
    console.log(`  - ID: ${s.id}`);
    console.log(`    Name: ${s.name}`);
    console.log(`    Active: ${s.active}`);
    console.log(`    Email: ${s.email || 'N/A'}`);
    console.log('');
  });

  // Identify canonical (keep) and duplicate (delete)
  const canonical = matchingShoppers.find(s => s.name === 'Mary Clair Bromfield');
  const duplicate = matchingShoppers.find(s => s.name === 'Mary Clair' && s.name !== 'Mary Clair Bromfield');

  if (!canonical) {
    console.log('ERROR: Could not find "Mary Clair Bromfield" record');
    process.exit(1);
    return;
  }

  if (!duplicate) {
    console.log('No duplicate "Mary Clair" record found (might already be merged)');
    process.exit(0);
    return;
  }

  console.log('Merge plan:');
  console.log(`  KEEP (canonical): "${canonical.name}" (${canonical.id})`);
  console.log(`  DELETE (duplicate): "${duplicate.name}" (${duplicate.id})`);
  console.log('');

  // Step 2: Find all Sales linked to the duplicate
  console.log('Step 2: Finding Sales linked to duplicate...\n');

  // ORIGINAL XATA: const salesWithDuplicate = await xata.db.Sales
  //   .filter({ 'shopper.id': duplicate.id })
  //   .select(['id', 'sale_reference', 'item_title', 'sale_date', 'shopper.name'])
  //   .getAll();
  const salesWithDuplicate = await db
    .select({
      id: sales.id,
      saleReference: sales.saleReference,
      itemTitle: sales.itemTitle,
      saleDate: sales.saleDate,
    })
    .from(sales)
    .where(eq(sales.shopperId, duplicate.id));

  console.log(`Found ${salesWithDuplicate.length} Sales linked to duplicate "${duplicate.name}":`);
  salesWithDuplicate.forEach(sale => {
    console.log(`  - ${sale.id}: ${sale.itemTitle || sale.saleReference || 'Unknown'} (${sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'No date'})`);
  });
  console.log('');

  // Verify canonical has more sales
  // ORIGINAL XATA: const salesWithCanonical = await xata.db.Sales
  //   .filter({ 'shopper.id': canonical.id })
  //   .select(['id'])
  //   .getAll();
  const salesWithCanonical = await db
    .select({ id: sales.id })
    .from(sales)
    .where(eq(sales.shopperId, canonical.id));

  console.log(`Sales linked to canonical "${canonical.name}": ${salesWithCanonical.length}`);
  console.log('');

  // Step 3: Check Buyers table for owner references
  console.log('Step 3: Finding Buyers with duplicate as owner...\n');

  // ORIGINAL XATA: const buyersWithDuplicate = await xata.db.Buyers
  //   .filter({ 'owner.id': duplicate.id })
  //   .select(['id', 'name', 'owner.name'])
  //   .getAll();
  const buyersWithDuplicate = await db
    .select({
      id: buyers.id,
      name: buyers.name,
    })
    .from(buyers)
    .where(eq(buyers.ownerId, duplicate.id));

  console.log(`Found ${buyersWithDuplicate.length} Buyers with duplicate as owner:`);
  buyersWithDuplicate.forEach(buyer => {
    console.log(`  - ${buyer.id}: ${buyer.name}`);
  });
  console.log('');

  // Step 4: Display merge operations
  console.log('=== MERGE OPERATIONS (to be executed) ===\n');

  if (salesWithDuplicate.length > 0) {
    console.log(`1. Update ${salesWithDuplicate.length} Sales record(s):`);
    salesWithDuplicate.forEach(sale => {
      console.log(`   UPDATE Sales SET shopper = '${canonical.id}' WHERE id = '${sale.id}'`);
    });
    console.log('');
  }

  if (buyersWithDuplicate.length > 0) {
    console.log(`2. Update ${buyersWithDuplicate.length} Buyers record(s):`);
    buyersWithDuplicate.forEach(buyer => {
      console.log(`   UPDATE Buyers SET owner = '${canonical.id}' WHERE id = '${buyer.id}'`);
    });
    console.log('');
  }

  console.log(`3. Delete duplicate shopper record:`);
  console.log(`   DELETE FROM Shoppers WHERE id = '${duplicate.id}'`);
  console.log('');

  // Check for --execute flag
  const shouldExecute = process.argv.includes('--execute');

  if (!shouldExecute) {
    console.log('=== DRY RUN COMPLETE ===');
    console.log('To execute the merge, run:');
    console.log('  npx tsx scripts/merge-shoppers.ts --execute');
    console.log('');
    process.exit(0);
    return;
  }

  // Execute the merge
  console.log('=== EXECUTING MERGE ===\n');

  // Update Sales
  if (salesWithDuplicate.length > 0) {
    console.log('Updating Sales...');
    for (const sale of salesWithDuplicate) {
      // ORIGINAL XATA: await xata.db.Sales.update(sale.id, { shopper: canonical.id });
      await db
        .update(sales)
        .set({ shopperId: canonical.id })
        .where(eq(sales.id, sale.id));
      console.log(`  Updated sale ${sale.id}`);
    }
    console.log('');
  }

  // Update Buyers
  if (buyersWithDuplicate.length > 0) {
    console.log('Updating Buyers...');
    for (const buyer of buyersWithDuplicate) {
      // ORIGINAL XATA: await xata.db.Buyers.update(buyer.id, { owner: canonical.id } as any);
      await db
        .update(buyers)
        .set({ ownerId: canonical.id })
        .where(eq(buyers.id, buyer.id));
      console.log(`  Updated buyer ${buyer.id}`);
    }
    console.log('');
  }

  // Delete duplicate
  console.log('Deleting duplicate shopper...');
  // ORIGINAL XATA: await xata.db.Shoppers.delete(duplicate.id);
  await db.delete(shoppers).where(eq(shoppers.id, duplicate.id));
  console.log(`  Deleted shopper ${duplicate.id}`);
  console.log('');

  console.log('=== MERGE COMPLETE ===');
  console.log(`All records now point to "${canonical.name}" (${canonical.id})`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
