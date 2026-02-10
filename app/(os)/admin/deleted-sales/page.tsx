/**
 * Club 19 Sales OS - Deleted Sales Page
 *
 * Shows soft-deleted sales records with restore functionality
 * Restricted: Superadmin only
 */

export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/getUserRole";
// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { isNotNull, desc } from "drizzle-orm";
import { DeletedSalesClient } from "./DeletedSalesClient";

export default async function DeletedSalesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const role = await getUserRole();
  if (role !== 'superadmin') {
    redirect('/dashboard');
  }

  // ORIGINAL XATA: const xata = getXataClient();

  // ORIGINAL XATA:
  // // Get all deleted Sales records
  // const deletedSales = await xata.db.Sales
  //   .filter({
  //     deleted_at: { $isNot: null }
  //   })
  //   .select([
  //     "id",
  //     "sale_reference",
  //     "sale_date",
  //     "xero_invoice_number",
  //     "brand",
  //     "item_title",
  //     "sale_amount_inc_vat",
  //     "deleted_at",
  //     "buyer.name",
  //     "shopper.name"
  //   ])
  //   .sort('deleted_at', 'desc')
  //   .getAll();

  // Get all deleted Sales records
  const deletedSales = await db.query.sales.findMany({
    where: isNotNull(sales.deletedAt),
    with: {
      buyer: true,
      shopper: true,
    },
    orderBy: [desc(sales.deletedAt)],
  });

  // Serialize for client component
  const serializedSales = deletedSales.map(sale => ({
    id: sale.id,
    sale_reference: sale.saleReference || null,
    sale_date: sale.saleDate ? sale.saleDate.toISOString() : null,
    xero_invoice_number: sale.xeroInvoiceNumber || null,
    brand: sale.brand || 'Unknown',
    item_title: sale.itemTitle || 'N/A',
    sale_amount_inc_vat: sale.saleAmountIncVat || 0,
    deleted_at: sale.deletedAt ? sale.deletedAt.toISOString() : null,
    buyer_name: sale.buyer?.name || 'Unknown',
    shopper_name: sale.shopper?.name || 'Unassigned',
  }));

  const totalRecords = serializedSales.length;
  const totalValue = serializedSales.reduce((sum, sale) => sum + sale.sale_amount_inc_vat, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Deleted Sales</h1>
        <p className="text-gray-600 mt-1">
          Soft-deleted sales records that can be restored
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Deleted Records</div>
          <div className="text-3xl font-bold text-gray-900">{totalRecords}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Value</div>
          <div className="text-3xl font-bold text-gray-900">
            £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Client Component with table and restore functionality */}
      <DeletedSalesClient sales={serializedSales} />
    </div>
  );
}
