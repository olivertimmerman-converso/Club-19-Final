/**
 * Normalise Supplier Names to Title Case
 *
 * Usage:
 *   npx tsx scripts/normalise-suppliers.ts           # DRY RUN (default)
 *   npx tsx scripts/normalise-suppliers.ts --execute  # Apply changes
 *
 * Applies toTitleCase() to all supplier names.
 * Dry run shows old → new names without writing.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../db';
import { suppliers } from '../db/schema';
import { eq } from 'drizzle-orm';

function toTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function main() {
  const execute = process.argv.includes('--execute');

  console.log(`\n=== SUPPLIER NAME NORMALISATION ${execute ? '(EXECUTE)' : '(DRY RUN)'} ===\n`);

  // Fetch all suppliers
  const allSuppliers = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
  console.log(`Total suppliers: ${allSuppliers.length}\n`);

  const changes: { id: string; oldName: string; newName: string }[] = [];

  for (const supplier of allSuppliers) {
    if (!supplier.name) continue;
    const normalised = toTitleCase(supplier.name);
    if (normalised !== supplier.name) {
      changes.push({ id: supplier.id, oldName: supplier.name, newName: normalised });
    }
  }

  if (changes.length === 0) {
    console.log('All supplier names are already normalised. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${changes.length} suppliers to normalise:\n`);
  for (const change of changes) {
    console.log(`  "${change.oldName}" → "${change.newName}"`);
  }

  if (!execute) {
    console.log(`\nDRY RUN — no changes made. Run with --execute to apply.\n`);
    process.exit(0);
  }

  console.log(`\nApplying ${changes.length} updates...\n`);
  let updated = 0;
  for (const change of changes) {
    await db
      .update(suppliers)
      .set({ name: change.newName })
      .where(eq(suppliers.id, change.id));
    updated++;
  }

  console.log(`Done! Updated ${updated} supplier names.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
