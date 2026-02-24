/**
 * Backfill completedAt for existing sales
 *
 * Sets completedAt = saleDate for sales that:
 * - Have completedAt IS NULL
 * - Are NOT deleted
 * - Are NOT xero_import source
 * - Either have commission already processed, or have all required data
 *
 * MUST be run BEFORE deploying commission timing changes, otherwise
 * sales without completedAt will disappear from monthly views.
 *
 * Usage:
 *   npx tsx scripts/backfill-completed-at.ts           # Execute backfill
 *   npx tsx scripts/backfill-completed-at.ts --dry-run  # Preview changes
 */

import { db } from "../db";
import { sales } from "../db/schema";
import { and, eq, ne, isNull, isNotNull } from "drizzle-orm";

const isDryRun = process.argv.includes("--dry-run");

async function backfillCompletedAt() {
  console.log("=== Backfill completedAt ===");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no writes)" : "LIVE"}\n`);

  // Count total sales missing completedAt
  const allMissing = await db
    .select({ id: sales.id })
    .from(sales)
    .where(
      and(
        isNull(sales.completedAt),
        isNull(sales.deletedAt),
        ne(sales.source, "xero_import")
      )
    );

  console.log(`Sales missing completedAt: ${allMissing.length}`);

  // Get eligible sales: those with commission processed or required data present
  const eligible = await db
    .select({
      id: sales.id,
      saleDate: sales.saleDate,
      commissionLocked: sales.commissionLocked,
      commissionPaid: sales.commissionPaid,
      buyPrice: sales.buyPrice,
      supplierId: sales.supplierId,
      brand: sales.brand,
      status: sales.status,
    })
    .from(sales)
    .where(
      and(
        isNull(sales.completedAt),
        isNull(sales.deletedAt),
        ne(sales.source, "xero_import")
      )
    );

  let willUpdate = 0;
  let skipped = 0;

  for (const sale of eligible) {
    // Skip ongoing sales — they shouldn't get completedAt until marked complete
    if (sale.status === "ongoing") {
      skipped++;
      continue;
    }

    const hasCommission =
      sale.commissionLocked === true || sale.commissionPaid === true;
    const hasRequiredData =
      sale.buyPrice != null &&
      sale.buyPrice > 0 &&
      sale.supplierId != null;

    if (hasCommission || hasRequiredData) {
      willUpdate++;
      if (!isDryRun && sale.saleDate) {
        await db
          .update(sales)
          .set({ completedAt: sale.saleDate })
          .where(eq(sales.id, sale.id));
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  ${isDryRun ? "Would update" : "Updated"}: ${willUpdate}`);
  console.log(`  Skipped (incomplete/ongoing): ${skipped}`);

  // Final count
  if (!isDryRun) {
    const remaining = await db
      .select({ id: sales.id })
      .from(sales)
      .where(
        and(
          isNull(sales.completedAt),
          isNull(sales.deletedAt),
          ne(sales.source, "xero_import")
        )
      );
    console.log(`  Still missing completedAt: ${remaining.length}`);
  }

  console.log("\nDone.");
}

backfillCompletedAt().catch(console.error);
