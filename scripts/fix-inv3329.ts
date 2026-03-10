/**
 * Fix INV-3329 amounts to match Xero
 * Usage: npx tsx scripts/fix-inv3329.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.vercel.pulled" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("@/db");
  const { sales, lineItems } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const { calculateMargins } = await import("@/lib/economics");
  const { roundCurrency } = await import("@/lib/utils/currency");

  // Xero values (fetched and confirmed)
  const xeroTotal = 24548.75;
  const xeroSubTotal = 24548.75;
  const xeroLineItems = [
    { description: "Birkin 25 \nJaune Milton\nEpsom Sellier \nPHW\nW stamp brand new (2024-2025 receipt)", quantity: 1, unitAmount: 23800, lineAmount: 23800 },
    { description: "Shipping to Budapest", quantity: 1, unitAmount: 150, lineAmount: 150 },
    { description: "Cc fee", quantity: 1, unitAmount: 598.75, lineAmount: 598.75 },
  ];

  // Get current sale
  const [sale] = await db.select().from(sales).where(eq(sales.xeroInvoiceNumber, "INV-3329")).limit(1);
  if (!sale) throw new Error("INV-3329 not found");

  console.log("Current DB amount:", sale.saleAmountIncVat);
  console.log("Xero amount:     ", xeroTotal);

  // Recalculate margins
  const margins = calculateMargins({
    saleAmountExVat: xeroSubTotal,
    buyPrice: sale.buyPrice,
    shippingCost: sale.shippingCost,
    cardFees: sale.cardFees,
    directCosts: sale.directCosts,
    introducerCommission: sale.introducerCommission,
  });

  // Update sale amounts
  await db.update(sales).set({
    saleAmountIncVat: roundCurrency(xeroTotal),
    saleAmountExVat: roundCurrency(xeroSubTotal),
    itemTitle: "Birkin 25 Jaune Milton Epsom Sellier PHW",
    grossMargin: margins.grossMargin,
    commissionableMargin: margins.commissionableMargin,
  }).where(eq(sales.id, sale.id));

  console.log("Sale amounts updated.");
  console.log("Gross margin:", margins.grossMargin);

  // Update line items (delete old xero_import ones, insert fresh)
  const deleted = await db.delete(lineItems).where(
    and(eq(lineItems.saleId, sale.id), eq(lineItems.source, "xero_import"))
  );
  console.log("Deleted old xero_import line items");

  for (let i = 0; i < xeroLineItems.length; i++) {
    const li = xeroLineItems[i];
    await db.insert(lineItems).values({
      saleId: sale.id,
      lineNumber: i + 1,
      description: li.description,
      quantity: li.quantity,
      sellPrice: li.unitAmount,
      lineTotal: li.lineAmount,
      brand: "Unknown",
      category: "Unknown",
      buyPrice: 0,
      lineMargin: 0,
      source: "xero_import",
    });
  }
  console.log("Inserted", xeroLineItems.length, "fresh line items from Xero");

  // Verify
  const [updated] = await db.select().from(sales).where(eq(sales.id, sale.id)).limit(1);
  console.log("\nVerification:");
  console.log("  saleAmountIncVat:", updated.saleAmountIncVat);
  console.log("  saleAmountExVat:", updated.saleAmountExVat);
  console.log("  itemTitle:", updated.itemTitle);

  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
