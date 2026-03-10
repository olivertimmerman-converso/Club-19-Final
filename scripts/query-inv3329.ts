import dotenv from "dotenv";
dotenv.config({ path: ".env.vercel.pulled" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("@/db");
  const { sales } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .select()
    .from(sales)
    .where(eq(sales.xeroInvoiceNumber, "INV-3329"));

  for (const row of rows) {
    console.log(JSON.stringify({
      id: row.id,
      xeroInvoiceNumber: row.xeroInvoiceNumber,
      xeroInvoiceId: row.xeroInvoiceId,
      saleAmountIncVat: row.saleAmountIncVat,
      saleAmountExVat: row.saleAmountExVat,
      itemTitle: row.itemTitle,
      saleDate: row.saleDate,
      updatedAt: row.updatedAt,
      invoiceStatus: row.invoiceStatus,
      deletedAt: row.deletedAt,
      source: row.source,
    }, null, 2));
  }

  // Also fetch from Xero
  const { getValidTokens } = await import("@/lib/xero-auth");
  const integrationUserId = process.env.XERO_INTEGRATION_CLERK_USER_ID;
  if (!integrationUserId) throw new Error("No XERO_INTEGRATION_CLERK_USER_ID");

  const tokens = await getValidTokens(integrationUserId);

  // Find by invoice number
  const xeroUrl = `https://api.xero.com/api.xro/2.0/Invoices?InvoiceNumbers=INV-3329`;
  const res = await fetch(xeroUrl, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Xero-Tenant-Id": tokens.tenantId,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.error("Xero API error:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const invoice = data.Invoices?.[0];
  if (invoice) {
    console.log("\n=== XERO DATA ===");
    console.log(JSON.stringify({
      InvoiceNumber: invoice.InvoiceNumber,
      InvoiceID: invoice.InvoiceID,
      Total: invoice.Total,
      SubTotal: invoice.SubTotal,
      Status: invoice.Status,
      UpdatedDateUTC: invoice.UpdatedDateUTC,
      Date: invoice.Date,
      LineItems: (invoice.LineItems || []).map((li: any) => ({
        Description: li.Description,
        Quantity: li.Quantity,
        UnitAmount: li.UnitAmount,
        LineAmount: li.LineAmount,
      })),
    }, null, 2));
  }

  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
