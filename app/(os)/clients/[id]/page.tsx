import { notFound } from "next/navigation";
// ORIGINAL XATA: import { XataClient } from "@/src/xata";
import { db } from "@/db";
import { sales, shoppers, buyers } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { getUserRole } from "@/lib/getUserRole";
import { ClientDetailClient } from "./ClientDetailClient";

export const dynamic = "force-dynamic";

/**
 * Club 19 Sales OS - Client Detail Page
 *
 * Displays a single client's profile and complete purchase history
 * Superadmin can assign/change client owner
 */

// ORIGINAL XATA: const xata = new XataClient();

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getUserRole();

  // ORIGINAL XATA:
  // const buyer = await xata.db.Buyers
  //   .select(['*', 'owner.id', 'owner.name'])
  //   .filter({ id })
  //   .getFirst();

  // Fetch buyer record with owner relationship
  const buyer = await db.query.buyers.findFirst({
    where: eq(buyers.id, id),
    with: {
      owner: true,
    },
  });

  // Handle not found
  if (!buyer) {
    notFound();
  }

  // ORIGINAL XATA:
  // const shoppersRaw = await xata.db.Shoppers
  //   .select(['id', 'name'])
  //   .filter({ active: true })
  //   .sort('name', 'asc')
  //   .getAll();

  // Fetch all active shoppers for owner dropdown
  const shoppersRaw = await db.query.shoppers.findMany({
    where: eq(shoppers.active, true),
    orderBy: [asc(shoppers.name)],
  });

  // ORIGINAL XATA:
  // const allSalesRaw = await xata.db.Sales
  //   .select([
  //     'id',
  //     'sale_date',
  //     'item_title',
  //     'brand',
  //     'sale_amount_inc_vat',
  //     'gross_margin',
  //     'xero_invoice_number',
  //     'invoice_status',
  //     'currency',
  //     'deleted_at',
  //     'source',
  //   ])
  //   .filter({
  //     'buyer.id': id
  //   })
  //   .sort('sale_date', 'desc')
  //   .getAll();

  // Fetch all sales for this client (show all in table, but filter for metrics)
  const allSalesRaw = await db.query.sales.findMany({
    where: eq(sales.buyerId, id),
    orderBy: [desc(sales.saleDate)],
  });

  // Filter out deleted sales in JavaScript (keeping consistent with original behavior)
  const salesData = allSalesRaw.filter(sale => !sale.deletedAt);

  // Filter to PAID invoices only for metrics
  const paidSales = salesData.filter(sale =>
    sale.invoiceStatus?.toUpperCase() === 'PAID'
  );

  // Calculate totals from PAID invoices only
  const totalSpend = paidSales.reduce((sum, sale) => sum + (sale.saleAmountIncVat || 0), 0);
  const totalMargin = paidSales.reduce((sum, sale) => sum + (sale.grossMargin || 0), 0);
  const tradesCount = paidSales.length;

  // Serialize client data for client component
  const serializedClient = {
    id: buyer.id,
    name: buyer.name || null,
    email: buyer.email || null,
    owner: buyer.owner ? {
      id: buyer.owner.id,
      name: buyer.owner.name || 'Unknown',
    } : null,
    owner_changed_at: buyer.ownerChangedAt
      ? new Date(buyer.ownerChangedAt).toISOString()
      : null,
    owner_changed_by: buyer.ownerChangedBy || null,
  };

  // Serialize shoppers for dropdown
  const serializedShoppers = shoppersRaw.map(s => ({
    id: s.id,
    name: s.name || 'Unknown',
  }));

  // Serialize sales data
  const serializedSales = salesData.map(sale => ({
    id: sale.id,
    sale_date: sale.saleDate ? sale.saleDate.toISOString() : null,
    item_title: sale.itemTitle || null,
    brand: sale.brand || null,
    sale_amount_inc_vat: sale.saleAmountIncVat || 0,
    gross_margin: sale.grossMargin || 0,
    xero_invoice_number: sale.xeroInvoiceNumber || null,
    invoice_status: sale.invoiceStatus || null,
    currency: sale.currency || 'GBP',
    source: sale.source || null,
  }));

  return (
    <ClientDetailClient
      client={serializedClient}
      shoppers={serializedShoppers}
      userRole={role}
      stats={{
        totalSpend,
        totalMargin,
        tradesCount,
        totalSales: salesData.length,
      }}
      sales={serializedSales}
    />
  );
}
