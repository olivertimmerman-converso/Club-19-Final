/**
 * Detect duplicate sales records by Xero invoice number
 *
 * During early January 2026, some invoices were created manually via
 * the Sales Atelier AND also imported from Xero. This script finds
 * any invoice number that appears more than once in active (non-deleted) sales.
 *
 * This is a READ-ONLY diagnostic tool. It does NOT modify any data.
 *
 * Run: npx tsx scripts/detect-duplicate-sales.ts
 */

import { db } from "../db";
import { sales } from "../db/schema";
import { and, isNull, isNotNull, sql } from "drizzle-orm";

async function detectDuplicates() {
  console.log("=== Duplicate Sales Detection Report ===\n");

  // Find invoice numbers that appear more than once in non-deleted sales
  const duplicateInvoiceNumbers = await db
    .select({
      xeroInvoiceNumber: sales.xeroInvoiceNumber,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(
      and(
        isNull(sales.deletedAt),
        isNotNull(sales.xeroInvoiceNumber)
      )
    )
    .groupBy(sales.xeroInvoiceNumber)
    .having(sql`count(*) > 1`);

  if (duplicateInvoiceNumbers.length === 0) {
    console.log("No duplicate invoice numbers found. All clear.\n");
    return;
  }

  let totalDuplicateRecords = 0;

  for (const dup of duplicateInvoiceNumbers) {
    console.log(`\n--- ${dup.xeroInvoiceNumber} (${dup.count} records) ---`);

    // Fetch all records for this invoice number
    const records = await db
      .select({
        id: sales.id,
        source: sales.source,
        xeroInvoiceId: sales.xeroInvoiceId,
        saleAmountIncVat: sales.saleAmountIncVat,
        invoiceStatus: sales.invoiceStatus,
        shopperId: sales.shopperId,
        status: sales.status,
        createdAt: sql<string>`"xata.createdAt"`,
        deletedAt: sales.deletedAt,
      })
      .from(sales)
      .where(
        and(
          sql`${sales.xeroInvoiceNumber} = ${dup.xeroInvoiceNumber}`,
          isNull(sales.deletedAt)
        )
      );

    for (const record of records) {
      console.log(
        `  id: ${record.id.slice(0, 12)}...` +
        `  source: ${(record.source || "null").padEnd(12)}` +
        `  xeroId: ${record.xeroInvoiceId ? "yes" : "NO "}` +
        `  amount: £${(record.saleAmountIncVat || 0).toLocaleString().padStart(8)}` +
        `  status: ${(record.invoiceStatus || record.status || "null").padEnd(10)}` +
        `  shopper: ${record.shopperId ? record.shopperId.slice(0, 8) + "..." : "none".padEnd(11)}` +
        `  created: ${record.createdAt || "unknown"}`
      );
    }

    totalDuplicateRecords += dup.count;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Invoice numbers with duplicates: ${duplicateInvoiceNumbers.length}`);
  console.log(`Total duplicate records: ${totalDuplicateRecords}`);
  console.log(`\nReview these manually and decide which records to keep/delete.`);
}

detectDuplicates().catch(console.error);
