/**
 * Backfill missing line items for Xero-imported sales
 *
 * Finds all sales with a xeroInvoiceId, fetches the invoice from Xero,
 * and inserts any missing line items into the lineItems table.
 *
 * Usage: npx tsx scripts/backfill-line-items.ts
 *        npx tsx scripts/backfill-line-items.ts --dry-run
 *        npx tsx scripts/backfill-line-items.ts --invoice INV-3341
 */

// Load env BEFORE any module imports (ESM hoists imports, so we use dynamic imports)
import dotenv from "dotenv";
dotenv.config({ path: ".env.vercel.pulled" });
dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const SINGLE_INVOICE = process.argv.includes("--invoice")
  ? process.argv[process.argv.indexOf("--invoice") + 1]
  : null;

interface XeroLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  LineAmount: number;
  AccountCode?: string;
}

async function main() {
  // Dynamic imports so env vars are available at module load time
  const { db } = await import("@/db");
  const { sales, lineItems } = await import("@/db/schema");
  const { eq, isNotNull, sql } = await import("drizzle-orm");
  const { getValidTokens } = await import("@/lib/xero-auth");

  console.log(`\n=== Backfill Line Items ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  if (SINGLE_INVOICE) console.log(`Target: ${SINGLE_INVOICE}`);
  console.log("");

  // 1. Get Xero tokens
  const integrationUserId = process.env.XERO_INTEGRATION_CLERK_USER_ID;
  if (!integrationUserId) {
    throw new Error("XERO_INTEGRATION_CLERK_USER_ID not set");
  }
  console.log("Fetching Xero tokens...");
  const tokens = await getValidTokens(integrationUserId);
  console.log("Tokens obtained.\n");

  // 2. Find all sales with xeroInvoiceId
  const allSales = await db
    .select({
      id: sales.id,
      xeroInvoiceId: sales.xeroInvoiceId,
      xeroInvoiceNumber: sales.xeroInvoiceNumber,
      itemTitle: sales.itemTitle,
      saleAmountIncVat: sales.saleAmountIncVat,
    })
    .from(sales)
    .where(
      SINGLE_INVOICE
        ? eq(sales.xeroInvoiceNumber, SINGLE_INVOICE)
        : isNotNull(sales.xeroInvoiceId)
    );

  const activeSales = allSales.filter((s) => s.xeroInvoiceId);
  console.log(`Found ${activeSales.length} sales with xeroInvoiceId\n`);

  // 3. Get existing line item counts per sale
  const existingCounts = await db
    .select({
      saleId: lineItems.saleId,
      count: sql<number>`count(*)::int`,
    })
    .from(lineItems)
    .groupBy(lineItems.saleId);

  const countMap = new Map(existingCounts.map((r) => [r.saleId, r.count]));

  // 4. Process each sale
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let salesFixed = 0;

  for (const sale of activeSales) {
    const existingCount = countMap.get(sale.id) || 0;

    try {
      // Fetch invoice from Xero
      const response = await fetch(
        `https://api.xero.com/api.xro/2.0/Invoices/${sale.xeroInvoiceId}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Xero-Tenant-Id": tokens.tenantId,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.log("  Rate limited, waiting 60s...");
          await new Promise((r) => setTimeout(r, 60000));
          continue;
        }
        console.log(
          `  ERROR: Xero API ${response.status} for ${sale.xeroInvoiceNumber}`
        );
        totalErrors++;
        continue;
      }

      const data = await response.json();
      const invoice = data.Invoices?.[0];
      if (!invoice) {
        console.log(`  ERROR: No invoice data for ${sale.xeroInvoiceNumber}`);
        totalErrors++;
        continue;
      }

      const xeroItems: XeroLineItem[] = invoice.LineItems || [];

      // Skip if counts already match
      if (existingCount === xeroItems.length) {
        totalSkipped++;
        continue;
      }

      // Get existing line items for dedup
      const existingItems =
        existingCount > 0
          ? await db
              .select({
                lineNumber: lineItems.lineNumber,
                description: lineItems.description,
              })
              .from(lineItems)
              .where(eq(lineItems.saleId, sale.id))
          : [];

      const existingLineNumbers = new Set(
        existingItems.map((li) => li.lineNumber)
      );
      const existingDescriptions = new Set(
        existingItems.map((li) => li.description)
      );

      let addedForSale = 0;

      for (let i = 0; i < xeroItems.length; i++) {
        const li = xeroItems[i];
        const lineNumber = i + 1;

        // Skip if already exists (match on lineNumber OR description)
        if (
          existingLineNumbers.has(lineNumber) ||
          existingDescriptions.has(li.Description)
        ) {
          continue;
        }

        console.log(
          `  ${sale.xeroInvoiceNumber}: Adding line ${lineNumber} — "${li.Description}" (qty ${li.Quantity}, £${li.LineAmount})`
        );

        if (!DRY_RUN) {
          await db.insert(lineItems).values({
            saleId: sale.id,
            lineNumber,
            description: li.Description || "Imported from Xero",
            quantity: li.Quantity || 1,
            sellPrice: li.UnitAmount || 0,
            lineTotal: li.LineAmount || 0,
            brand: "Unknown",
            category: "Unknown",
            buyPrice: 0,
            lineMargin: 0,
            source: "xero_import",
          });
        }

        addedForSale++;
        totalAdded++;
      }

      if (addedForSale > 0) {
        salesFixed++;
        console.log(
          `  ${sale.xeroInvoiceNumber}: +${addedForSale} line items (was ${existingCount}, Xero has ${xeroItems.length})`
        );
      }

      // Small delay to respect Xero rate limits (60 calls/min)
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      console.log(
        `  ERROR processing ${sale.xeroInvoiceNumber}: ${err.message}`
      );
      totalErrors++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Sales checked: ${activeSales.length}`);
  console.log(`Sales fixed: ${salesFixed}`);
  console.log(`Line items added: ${totalAdded}`);
  console.log(`Sales already correct: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  if (DRY_RUN) console.log(`\n(DRY RUN — no changes made)`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
