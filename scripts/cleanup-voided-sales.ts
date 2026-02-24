/**
 * Cleanup VOIDED sales that were never soft-deleted
 *
 * When Xero marks an invoice as VOIDED, the payment sync cron
 * previously only updated invoiceStatus but left deletedAt as NULL.
 * This script finds those records and soft-deletes them.
 *
 * Usage:
 *   npx tsx scripts/cleanup-voided-sales.ts          # Dry run (default)
 *   npx tsx scripts/cleanup-voided-sales.ts --apply   # Execute cleanup
 */

import { db } from "../db";
import { sales } from "../db/schema";
import { and, eq, isNull } from "drizzle-orm";

const isApply = process.argv.includes("--apply");

async function cleanupVoidedSales() {
  console.log("=== Cleanup VOIDED Sales ===");
  console.log(`Mode: ${isApply ? "APPLY (will update)" : "DRY RUN (read only)"}\n`);

  // Find VOIDED sales that aren't soft-deleted
  const voidedSales = await db
    .select({
      id: sales.id,
      xeroInvoiceNumber: sales.xeroInvoiceNumber,
      saleReference: sales.saleReference,
      saleAmountIncVat: sales.saleAmountIncVat,
      invoiceStatus: sales.invoiceStatus,
      source: sales.source,
    })
    .from(sales)
    .where(
      and(
        eq(sales.invoiceStatus, "VOIDED"),
        isNull(sales.deletedAt)
      )
    );

  console.log(`Found ${voidedSales.length} VOIDED sales with deletedAt = NULL:\n`);

  for (const sale of voidedSales) {
    console.log(
      `  ${sale.xeroInvoiceNumber || sale.saleReference || sale.id.slice(0, 8)} — ` +
      `£${sale.saleAmountIncVat?.toLocaleString() ?? "0"} — source: ${sale.source}`
    );
  }

  if (voidedSales.length === 0) {
    console.log("  (none found)\n\nNo cleanup needed.");
    return;
  }

  if (!isApply) {
    console.log(`\nDry run complete. Run with --apply to soft-delete these ${voidedSales.length} records.`);
    return;
  }

  // Apply soft-delete
  let updated = 0;
  for (const sale of voidedSales) {
    await db
      .update(sales)
      .set({ deletedAt: new Date() })
      .where(eq(sales.id, sale.id));
    updated++;
    console.log(`  Soft-deleted: ${sale.xeroInvoiceNumber || sale.id.slice(0, 8)}`);
  }

  console.log(`\nDone. Soft-deleted ${updated} VOIDED sales.`);
}

cleanupVoidedSales().catch(console.error);
