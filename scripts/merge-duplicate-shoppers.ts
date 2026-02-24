/**
 * Merge duplicate shopper records
 *
 * Problem: Multiple shopper records exist for the same person (e.g.
 * "Mary Clair" vs "Mary Clair Bromfield" vs "Mary Claire"). MC's Clerk
 * account is linked to one record, but some of her sales are assigned to
 * a different one. This causes the status API to reject her changes with
 * "You can only change status of your own sales."
 *
 * This script:
 * 1. Finds ALL shopper records where name contains "Mary" (case-insensitive)
 * 2. Identifies the correct record (the one with a Clerk user ID)
 * 3. Reassigns sales.shopperId, sales.ownerId, and buyers.ownerId
 * 4. Deactivates the duplicate records (sets active = false)
 * 5. Also scans for ANY other duplicate shoppers in the system
 *
 * Usage:
 *   npx tsx scripts/merge-duplicate-shoppers.ts          # Dry run (default)
 *   npx tsx scripts/merge-duplicate-shoppers.ts --apply   # Execute merge
 */

import { db } from "../db";
import { shoppers, sales, buyers } from "../db/schema";
import { eq, ilike, sql, and } from "drizzle-orm";

const isApply = process.argv.includes("--apply");

async function mergeDuplicateShoppers() {
  console.log("=== Merge Duplicate Shoppers ===");
  console.log(`Mode: ${isApply ? "APPLY (will update)" : "DRY RUN (read only)"}\n`);

  // ---------------------------------------------------------------
  // Step 1: Find all "Mary" shopper records
  // ---------------------------------------------------------------
  console.log("--- Step 1: All shopper records matching 'Mary' ---\n");

  const maryRecords = await db
    .select({
      id: shoppers.id,
      name: shoppers.name,
      email: shoppers.email,
      clerkUserId: shoppers.clerkUserId,
      active: shoppers.active,
    })
    .from(shoppers)
    .where(ilike(shoppers.name, "%mary%"));

  if (maryRecords.length === 0) {
    console.log("  No shopper records matching 'Mary' found.\n");
    await scanForAllDuplicates();
    return;
  }

  for (const record of maryRecords) {
    // Count sales assigned via shopperId
    const [salesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sales)
      .where(eq(sales.shopperId, record.id));

    // Count sales assigned via ownerId
    const [ownerSalesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sales)
      .where(eq(sales.ownerId, record.id));

    // Count buyers owned
    const [buyersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buyers)
      .where(eq(buyers.ownerId, record.id));

    console.log(
      `  id:       ${record.id}\n` +
      `  name:     ${record.name || "(null)"}\n` +
      `  email:    ${record.email || "(null)"}\n` +
      `  clerkId:  ${record.clerkUserId || "(none)"}\n` +
      `  active:   ${record.active}\n` +
      `  sales (shopperId): ${salesCount.count}\n` +
      `  sales (ownerId):   ${ownerSalesCount.count}\n` +
      `  buyers (ownerId):  ${buyersCount.count}\n`
    );
  }

  // ---------------------------------------------------------------
  // Step 2: Identify the canonical record (has Clerk user ID)
  // ---------------------------------------------------------------
  console.log("--- Step 2: Identify canonical record ---\n");

  const withClerk = maryRecords.filter((r) => r.clerkUserId);
  const withoutClerk = maryRecords.filter((r) => !r.clerkUserId);

  if (withClerk.length === 0) {
    console.log("  ERROR: No Mary record has a Clerk user ID linked!");
    console.log("  Cannot determine canonical record. Aborting.\n");
    return;
  }

  if (withClerk.length > 1) {
    console.log("  WARNING: Multiple Mary records have Clerk user IDs:");
    for (const r of withClerk) {
      console.log(`    ${r.id} — ${r.name} — ${r.clerkUserId}`);
    }
    console.log("  Manual intervention required. Aborting.\n");
    return;
  }

  const canonical = withClerk[0];
  const duplicates = withoutClerk;

  console.log(`  Canonical record: ${canonical.id} (${canonical.name})`);
  console.log(`  Clerk user ID:    ${canonical.clerkUserId}`);
  console.log(`  Duplicates to merge: ${duplicates.length}`);
  for (const dup of duplicates) {
    console.log(`    ${dup.id} — ${dup.name} — active: ${dup.active}`);
  }
  console.log();

  if (duplicates.length === 0) {
    console.log("  No duplicates to merge. MC only has one record.\n");
    await scanForAllDuplicates();
    return;
  }

  // ---------------------------------------------------------------
  // Step 3: Plan reassignments
  // ---------------------------------------------------------------
  console.log("--- Step 3: Reassignment plan ---\n");

  for (const dup of duplicates) {
    // Sales with shopperId pointing to duplicate
    const dupSales = await db
      .select({
        id: sales.id,
        xeroInvoiceNumber: sales.xeroInvoiceNumber,
        saleReference: sales.saleReference,
        saleAmountIncVat: sales.saleAmountIncVat,
        saleDate: sales.saleDate,
      })
      .from(sales)
      .where(eq(sales.shopperId, dup.id));

    if (dupSales.length > 0) {
      console.log(`  Reassign ${dupSales.length} sales (shopperId) from "${dup.name}" → "${canonical.name}":`);
      for (const s of dupSales) {
        const ref = s.xeroInvoiceNumber || s.saleReference || s.id.slice(0, 8);
        const date = s.saleDate ? s.saleDate.toISOString().slice(0, 10) : "no date";
        console.log(`    ${ref} — £${s.saleAmountIncVat?.toLocaleString() ?? "0"} — ${date}`);
      }
    } else {
      console.log(`  No sales (shopperId) on "${dup.name}"`);
    }

    // Sales with ownerId pointing to duplicate
    const dupOwnerSales = await db
      .select({
        id: sales.id,
        xeroInvoiceNumber: sales.xeroInvoiceNumber,
        saleReference: sales.saleReference,
      })
      .from(sales)
      .where(eq(sales.ownerId, dup.id));

    if (dupOwnerSales.length > 0) {
      console.log(`  Reassign ${dupOwnerSales.length} sales (ownerId) from "${dup.name}" → "${canonical.name}":`);
      for (const s of dupOwnerSales) {
        const ref = s.xeroInvoiceNumber || s.saleReference || s.id.slice(0, 8);
        console.log(`    ${ref}`);
      }
    } else {
      console.log(`  No sales (ownerId) on "${dup.name}"`);
    }

    // Buyers with ownerId pointing to duplicate
    const dupBuyers = await db
      .select({
        id: buyers.id,
        name: buyers.name,
      })
      .from(buyers)
      .where(eq(buyers.ownerId, dup.id));

    if (dupBuyers.length > 0) {
      console.log(`  Reassign ${dupBuyers.length} buyers (ownerId) from "${dup.name}" → "${canonical.name}":`);
      for (const b of dupBuyers) {
        console.log(`    ${b.name || b.id.slice(0, 8)}`);
      }
    } else {
      console.log(`  No buyers (ownerId) on "${dup.name}"`);
    }

    console.log();
  }

  // ---------------------------------------------------------------
  // Step 4: Apply changes (only if --apply)
  // ---------------------------------------------------------------
  if (!isApply) {
    console.log("--- DRY RUN complete ---");
    console.log(`Run with --apply to execute the merge.\n`);
    await scanForAllDuplicates();
    return;
  }

  console.log("--- Step 4: Applying changes ---\n");

  for (const dup of duplicates) {
    // Reassign sales.shopperId
    const shopperResult = await db
      .update(sales)
      .set({ shopperId: canonical.id })
      .where(eq(sales.shopperId, dup.id))
      .returning({ id: sales.id });
    console.log(`  Reassigned ${shopperResult.length} sales (shopperId) from ${dup.id} → ${canonical.id}`);

    // Reassign sales.ownerId
    const ownerResult = await db
      .update(sales)
      .set({ ownerId: canonical.id })
      .where(eq(sales.ownerId, dup.id))
      .returning({ id: sales.id });
    console.log(`  Reassigned ${ownerResult.length} sales (ownerId) from ${dup.id} → ${canonical.id}`);

    // Reassign buyers.ownerId
    const buyerResult = await db
      .update(buyers)
      .set({ ownerId: canonical.id })
      .where(eq(buyers.ownerId, dup.id))
      .returning({ id: buyers.id });
    console.log(`  Reassigned ${buyerResult.length} buyers (ownerId) from ${dup.id} → ${canonical.id}`);

    // Deactivate the duplicate record
    await db
      .update(shoppers)
      .set({ active: false })
      .where(eq(shoppers.id, dup.id));
    console.log(`  Deactivated shopper: ${dup.id} (${dup.name})`);

    console.log();
  }

  // ---------------------------------------------------------------
  // Step 5: Verify
  // ---------------------------------------------------------------
  console.log("--- Step 5: Verification ---\n");

  const [finalSalesCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .where(eq(sales.shopperId, canonical.id));

  const [finalBuyersCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(buyers)
    .where(eq(buyers.ownerId, canonical.id));

  console.log(`  Canonical shopper: ${canonical.id} (${canonical.name})`);
  console.log(`  Total sales (shopperId): ${finalSalesCount.count}`);
  console.log(`  Total buyers (ownerId):  ${finalBuyersCount.count}`);

  // Check no sales remain on deactivated records
  for (const dup of duplicates) {
    const [remaining] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sales)
      .where(eq(sales.shopperId, dup.id));

    if (remaining.count > 0) {
      console.log(`  WARNING: ${remaining.count} sales still on deactivated record ${dup.id}!`);
    }
  }

  // Check shopper dropdown would show only one active Mary
  const activeMarys = await db
    .select({ id: shoppers.id, name: shoppers.name, active: shoppers.active })
    .from(shoppers)
    .where(and(ilike(shoppers.name, "%mary%"), eq(shoppers.active, true)));

  console.log(`\n  Active "Mary" shoppers (should be 1): ${activeMarys.length}`);
  for (const m of activeMarys) {
    console.log(`    ${m.id} — ${m.name}`);
  }

  console.log("\nDone.");

  await scanForAllDuplicates();
}

// ---------------------------------------------------------------
// Bonus: scan for ANY other duplicate shoppers
// ---------------------------------------------------------------
async function scanForAllDuplicates() {
  console.log("\n--- Bonus: Scanning for ALL duplicate shoppers ---\n");

  // Get all active shoppers
  const allShoppers = await db
    .select({
      id: shoppers.id,
      name: shoppers.name,
      clerkUserId: shoppers.clerkUserId,
      active: shoppers.active,
    })
    .from(shoppers)
    .where(eq(shoppers.active, true));

  // Group by normalised name (lowercase, trimmed)
  const groups = new Map<string, typeof allShoppers>();
  for (const s of allShoppers) {
    const key = (s.name || "").toLowerCase().trim();
    if (!key) continue;
    const existing = groups.get(key) || [];
    existing.push(s);
    groups.set(key, existing);
  }

  // Also check for near-duplicates (first name match with different last names)
  const firstNameGroups = new Map<string, typeof allShoppers>();
  for (const s of allShoppers) {
    const firstName = (s.name || "").toLowerCase().trim().split(/\s+/)[0];
    if (!firstName || firstName.length < 3) continue;
    const existing = firstNameGroups.get(firstName) || [];
    existing.push(s);
    firstNameGroups.set(firstName, existing);
  }

  let foundDuplicates = false;

  // Exact name duplicates
  for (const [name, records] of groups) {
    if (records.length > 1) {
      foundDuplicates = true;
      console.log(`  DUPLICATE (exact): "${name}" appears ${records.length} times:`);
      for (const r of records) {
        console.log(`    ${r.id} — clerkId: ${r.clerkUserId || "(none)"}`);
      }
    }
  }

  // First-name-only matches (potential duplicates)
  for (const [firstName, records] of firstNameGroups) {
    if (records.length > 1) {
      // Only show if the names are actually different (not already caught above)
      const uniqueNames = new Set(records.map((r) => (r.name || "").toLowerCase().trim()));
      if (uniqueNames.size > 1) {
        foundDuplicates = true;
        console.log(`  POTENTIAL DUPLICATE (first name "${firstName}"):`);
        for (const r of records) {
          console.log(`    ${r.id} — ${r.name} — clerkId: ${r.clerkUserId || "(none)"}`);
        }
      }
    }
  }

  if (!foundDuplicates) {
    console.log("  No duplicate shoppers found. All clear.");
  }

  console.log();
}

mergeDuplicateShoppers().catch(console.error);
