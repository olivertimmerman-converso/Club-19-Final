/**
 * One-off script to merge Mary Clair duplicate shopper
 *
 * Canonical: "Mary Clair Bromfield" (rec_d5dt9i185bnc3iimglfg) - 7 sales
 * Duplicate: "Mary Clair" (rec_d5oughbmjuvmgp14hn00) - 1 sale
 *
 * Usage: npx tsx scripts/merge-mary-clair.ts
 * Add --execute flag to actually run the merge
 */

import { config } from 'dotenv';
// ORIGINAL XATA: import { XataClient } from '../src/xata';
import { db } from '../db';
import { shoppers, sales, buyers } from '../db/schema';
import { eq } from 'drizzle-orm';

// Load .env.local
config({ path: '.env.local' });

// ORIGINAL XATA:
// const xata = new XataClient({
//   apiKey: process.env.XATA_API_KEY,
//   branch: process.env.XATA_BRANCH || 'main',
// });

const CANONICAL_ID = 'rec_d5dt9i185bnc3iimglfg'; // Mary Clair Bromfield
const DUPLICATE_ID = 'rec_d5oughbmjuvmgp14hn00'; // Mary Clair

async function main() {
  console.log('\n=== MERGE MARY CLAIR DUPLICATE ===\n');

  // Step 1: Verify both records exist
  console.log('Step 1: Verifying records...\n');

  // ORIGINAL XATA: const canonical = await xata.db.Shoppers.filter({ id: CANONICAL_ID }).getFirst();
  // ORIGINAL XATA: const duplicate = await xata.db.Shoppers.filter({ id: DUPLICATE_ID }).getFirst();
  const canonicalResults = await db.select().from(shoppers).where(eq(shoppers.id, CANONICAL_ID)).limit(1);
  const duplicateResults = await db.select().from(shoppers).where(eq(shoppers.id, DUPLICATE_ID)).limit(1);
  const canonical = canonicalResults[0] || null;
  const duplicate = duplicateResults[0] || null;

  if (!canonical) {
    console.log(`ERROR: Canonical record not found (${CANONICAL_ID})`);
    console.log('The merge may have already been completed.');
    process.exit(0);
    return;
  }

  console.log(`✓ Canonical: "${canonical.name}" (${canonical.id})`);

  if (!duplicate) {
    console.log(`\n✓ Duplicate record not found (${DUPLICATE_ID})`);
    console.log('The merge has already been completed!');
    process.exit(0);
    return;
  }

  console.log(`✓ Duplicate: "${duplicate.name}" (${duplicate.id})`);

  // Step 2: Find Sales linked to duplicate
  console.log('\nStep 2: Finding Sales linked to duplicate...\n');

  // ORIGINAL XATA: const salesWithDuplicate = await xata.db.Sales
  //   .filter({ 'shopper.id': DUPLICATE_ID })
  //   .select(['id', 'sale_reference', 'item_title', 'sale_date'])
  //   .getAll();
  const salesWithDuplicate = await db
    .select({
      id: sales.id,
      saleReference: sales.saleReference,
      itemTitle: sales.itemTitle,
      saleDate: sales.saleDate,
    })
    .from(sales)
    .where(eq(sales.shopperId, DUPLICATE_ID));

  console.log(`Found ${salesWithDuplicate.length} Sale(s) linked to duplicate:`);
  salesWithDuplicate.forEach(sale => {
    console.log(`  - ${sale.id}: ${sale.itemTitle || sale.saleReference || 'Unknown'}`);
  });

  // Step 3: Find Buyers with duplicate as owner
  console.log('\nStep 3: Finding Buyers with duplicate as owner...\n');

  // ORIGINAL XATA: const buyersWithDuplicate = await xata.db.Buyers
  //   .filter({ 'owner.id': DUPLICATE_ID })
  //   .select(['id', 'name'])
  //   .getAll();
  const buyersWithDuplicate = await db
    .select({
      id: buyers.id,
      name: buyers.name,
    })
    .from(buyers)
    .where(eq(buyers.ownerId, DUPLICATE_ID));

  console.log(`Found ${buyersWithDuplicate.length} Buyer(s) with duplicate as owner:`);
  buyersWithDuplicate.forEach(buyer => {
    console.log(`  - ${buyer.id}: ${buyer.name}`);
  });

  // Check for --execute flag
  const shouldExecute = process.argv.includes('--execute');

  if (!shouldExecute) {
    console.log('\n=== DRY RUN COMPLETE ===');
    console.log('\nTo execute the merge, run:');
    console.log('  npx tsx scripts/merge-mary-clair.ts --execute');
    process.exit(0);
    return;
  }

  // Execute the merge
  console.log('\n=== EXECUTING MERGE ===\n');

  // Update Sales
  if (salesWithDuplicate.length > 0) {
    console.log('Updating Sales...');
    for (const sale of salesWithDuplicate) {
      // ORIGINAL XATA: await xata.db.Sales.update(sale.id, { shopper: CANONICAL_ID });
      await db
        .update(sales)
        .set({ shopperId: CANONICAL_ID })
        .where(eq(sales.id, sale.id));
      console.log(`  ✓ Updated sale ${sale.id}`);
    }
  }

  // Update Buyers
  if (buyersWithDuplicate.length > 0) {
    console.log('\nUpdating Buyers...');
    for (const buyer of buyersWithDuplicate) {
      // ORIGINAL XATA: await xata.db.Buyers.update(buyer.id, { owner: CANONICAL_ID } as any);
      await db
        .update(buyers)
        .set({ ownerId: CANONICAL_ID })
        .where(eq(buyers.id, buyer.id));
      console.log(`  ✓ Updated buyer ${buyer.id}`);
    }
  }

  // Delete duplicate
  console.log('\nDeleting duplicate shopper...');
  // ORIGINAL XATA: await xata.db.Shoppers.delete(DUPLICATE_ID);
  await db.delete(shoppers).where(eq(shoppers.id, DUPLICATE_ID));
  console.log(`  ✓ Deleted shopper ${DUPLICATE_ID}`);

  // Verify
  console.log('\n=== MERGE COMPLETE ===\n');

  // ORIGINAL XATA: const finalSalesCount = await xata.db.Sales
  //   .filter({ 'shopper.id': CANONICAL_ID })
  //   .getAll();
  const finalSalesCount = await db
    .select({ id: sales.id })
    .from(sales)
    .where(eq(sales.shopperId, CANONICAL_ID));

  console.log(`"${canonical.name}" now has ${finalSalesCount.length} sales`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
