/**
 * Deduplicate Suppliers
 *
 * Usage:
 *   npx tsx scripts/deduplicate-suppliers.ts           # DRY RUN (default)
 *   npx tsx scripts/deduplicate-suppliers.ts --execute  # Apply confirmed merges
 *
 * After normalisation, groups suppliers by exact name match and proposes merges.
 * Chanel store locations (Bond Street, Sloane, Nice, Walton etc.) are flagged
 * as KEEP — these are different physical stores, not duplicates.
 *
 * Run normalise-suppliers.ts FIRST so names are consistent.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../db';
import { suppliers, sales } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

// Known Chanel store locations — these should NOT be merged
const CHANEL_KEEP_PATTERNS = [
  'bond street', 'sloane', 'walton', 'nice', 'brompton',
  'harrods', 'selfridges', 'new bond', 'old bond',
];

function isChannelStoreVariant(name: string): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes('chanel')) return false;
  return CHANEL_KEEP_PATTERNS.some((pattern) => lower.includes(pattern));
}

interface SupplierRecord {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date | null;
}

async function main() {
  const execute = process.argv.includes('--execute');

  console.log(`\n=== SUPPLIER DEDUPLICATION ${execute ? '(EXECUTE)' : '(DRY RUN)'} ===\n`);

  // Fetch all suppliers
  const allSuppliers = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      email: suppliers.email,
      createdAt: suppliers.createdAt,
    })
    .from(suppliers);

  console.log(`Total suppliers: ${allSuppliers.length}\n`);

  // Group by exact normalised name (should already be normalised)
  const groups = new Map<string, SupplierRecord[]>();
  for (const s of allSuppliers) {
    const key = (s.name || '').toLowerCase().trim();
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(s);
    groups.set(key, group);
  }

  // Find duplicates (groups with >1 entry)
  const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate suppliers found. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${duplicateGroups.length} duplicate groups:\n`);

  // Get sale counts for each supplier
  const saleCounts = await db
    .select({
      supplierId: sales.supplierId,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(sql`${sales.supplierId} IS NOT NULL`)
    .groupBy(sales.supplierId);

  const saleCountMap = new Map(saleCounts.map((r) => [r.supplierId, r.count]));

  const merges: { keepId: string; keepName: string; removeIds: string[] }[] = [];
  const reviews: { name: string; ids: string[]; reason: string }[] = [];

  for (const [key, group] of duplicateGroups) {
    // Check if this is a Chanel store variant situation
    if (group.some((s) => isChannelStoreVariant(s.name || ''))) {
      reviews.push({
        name: group[0].name || key,
        ids: group.map((s) => s.id),
        reason: 'Chanel store location — verify manually',
      });
      continue;
    }

    // Sort: prefer one with most sales, then oldest (first created)
    group.sort((a, b) => {
      const aCount = saleCountMap.get(a.id) || 0;
      const bCount = saleCountMap.get(b.id) || 0;
      if (bCount !== aCount) return bCount - aCount;
      return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
    });

    const keep = group[0];
    const remove = group.slice(1);

    console.log(`  "${keep.name}"`);
    console.log(`    KEEP:   ${keep.id} (${saleCountMap.get(keep.id) || 0} sales)`);
    for (const r of remove) {
      console.log(`    REMOVE: ${r.id} (${saleCountMap.get(r.id) || 0} sales)`);
    }
    console.log();

    merges.push({
      keepId: keep.id,
      keepName: keep.name || key,
      removeIds: remove.map((r) => r.id),
    });
  }

  if (reviews.length > 0) {
    console.log(`\n--- NEEDS MANUAL REVIEW (${reviews.length}) ---\n`);
    for (const r of reviews) {
      console.log(`  "${r.name}" — ${r.reason}`);
      for (const id of r.ids) {
        console.log(`    ${id} (${saleCountMap.get(id) || 0} sales)`);
      }
      console.log();
    }
  }

  if (merges.length === 0) {
    console.log('No automatic merges to perform. Only manual review items above.');
    process.exit(0);
  }

  console.log(`\n${merges.length} merge(s) ready. ${reviews.length} need manual review.`);

  if (!execute) {
    console.log(`\nDRY RUN — no changes made. Run with --execute to apply merges (skipping REVIEW items).\n`);
    process.exit(0);
  }

  console.log(`\nExecuting ${merges.length} merges...\n`);

  for (const merge of merges) {
    for (const removeId of merge.removeIds) {
      // Reassign sales from duplicate to keeper
      const result = await db
        .update(sales)
        .set({ supplierId: merge.keepId })
        .where(eq(sales.supplierId, removeId));

      console.log(`  Reassigned sales from ${removeId} → ${merge.keepId} (${merge.keepName})`);

      // Delete the duplicate supplier
      await db.delete(suppliers).where(eq(suppliers.id, removeId));
      console.log(`  Deleted duplicate supplier ${removeId}`);
    }
  }

  console.log(`\nDone! Merged ${merges.length} duplicate groups.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
