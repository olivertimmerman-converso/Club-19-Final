import { notFound } from "next/navigation";
import { XataClient } from "@/src/xata";
import { getUserRole } from "@/lib/getUserRole";
import { ClientDetailClient } from "./ClientDetailClient";

export const dynamic = "force-dynamic";

/**
 * Club 19 Sales OS - Client Detail Page
 *
 * Displays a single client's profile and complete purchase history
 * Superadmin can assign/change client owner
 */

const xata = new XataClient();

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getUserRole();

  // Fetch buyer record from Xata with owner relationship
  const buyer = await xata.db.Buyers
    .select(['*', 'owner.id', 'owner.name'])
    .filter({ id })
    .getFirst();

  // Handle not found
  if (!buyer) {
    notFound();
  }

  // Fetch all active shoppers for owner dropdown
  const shoppersRaw = await xata.db.Shoppers
    .select(['id', 'name'])
    .filter({ active: true })
    .sort('name', 'asc')
    .getAll();

  // Fetch all sales for this client (show all in table, but filter for metrics)
  const allSalesRaw = await xata.db.Sales
    .select([
      'id',
      'sale_date',
      'item_title',
      'brand',
      'sale_amount_inc_vat',
      'gross_margin',
      'xero_invoice_number',
      'invoice_status',
      'currency',
      'deleted_at',
      'source',
    ])
    .filter({
      'buyer.id': id
    })
    .sort('sale_date', 'desc')
    .getAll();

  // Filter out deleted sales in JavaScript (Xata's $is: null doesn't work reliably for datetime fields)
  const sales = allSalesRaw.filter(sale => !sale.deleted_at);

  // Filter to PAID invoices only for metrics
  const paidSales = sales.filter(sale =>
    sale.invoice_status?.toUpperCase() === 'PAID'
  );

  // Calculate totals from PAID invoices only
  const totalSpend = paidSales.reduce((sum, sale) => sum + (sale.sale_amount_inc_vat || 0), 0);
  const totalMargin = paidSales.reduce((sum, sale) => sum + (sale.gross_margin || 0), 0);
  const tradesCount = paidSales.length;

  // Serialize client data for client component
  const serializedClient = {
    id: buyer.id,
    name: buyer.name || null,
    email: buyer.email || null,
    owner: (buyer as any).owner ? {
      id: (buyer as any).owner.id,
      name: (buyer as any).owner.name || 'Unknown',
    } : null,
    owner_changed_at: (buyer as any).owner_changed_at
      ? new Date((buyer as any).owner_changed_at).toISOString()
      : null,
    owner_changed_by: (buyer as any).owner_changed_by || null,
  };

  // Serialize shoppers for dropdown
  const serializedShoppers = shoppersRaw.map(s => ({
    id: s.id,
    name: s.name || 'Unknown',
  }));

  // Serialize sales data
  const serializedSales = sales.map(sale => ({
    id: sale.id,
    sale_date: sale.sale_date ? sale.sale_date.toISOString() : null,
    item_title: sale.item_title || null,
    brand: sale.brand || null,
    sale_amount_inc_vat: sale.sale_amount_inc_vat || 0,
    gross_margin: sale.gross_margin || 0,
    xero_invoice_number: sale.xero_invoice_number || null,
    invoice_status: sale.invoice_status || null,
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
        totalSales: sales.length,
      }}
      sales={serializedSales}
    />
  );
}
