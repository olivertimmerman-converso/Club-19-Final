/**
 * Club 19 Sales OS - Sale Data Completion Page
 *
 * Allows shoppers (and admins) to complete missing data on sales
 * that were adopted from Xero or claimed without full details.
 */

import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { db } from "@/db";
import { sales, buyers, shoppers, suppliers as suppliersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { assessCompleteness } from "@/lib/completeness";
import { CompleteDataClient } from "./CompleteDataClient";

export default async function CompleteDataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const role = await getUserRole();
  const { id: saleId } = await params;

  // Fetch the sale with relations
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: {
      buyer: true,
      shopper: true,
      supplier: true,
    },
  });

  if (!sale) {
    redirect("/sales");
  }

  // Check if user can edit this sale
  // - Superadmin, founder, operations can edit any sale
  // - Shoppers can only edit their own sales
  const canEditAny = ["superadmin", "founder", "operations"].includes(role || "");

  if (!canEditAny) {
    // Get the shopper record for the current user
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userFullName = user?.fullName;

    if (!userFullName) {
      redirect("/sales");
    }

    const shopperRecord = await db.query.shoppers.findFirst({
      where: eq(shoppers.name, userFullName),
    });

    // Check if this sale belongs to the current shopper
    if (!shopperRecord || sale.shopperId !== shopperRecord.id) {
      // Finance can't edit, and shoppers can only edit their own
      if (role === "finance") {
        redirect("/sales/" + saleId);
      }
      redirect("/staff/shopper/sales");
    }
  }

  // Fetch all suppliers for dropdown
  const supplierRows = await db
    .select({ id: suppliersTable.id, name: suppliersTable.name })
    .from(suppliersTable)
    .orderBy(suppliersTable.name);

  // Filter out suppliers with null names and ensure type safety
  const allSuppliers = supplierRows
    .filter((s): s is { id: string; name: string } => s.name !== null);

  // Assess completeness
  const completeness = assessCompleteness({
    supplierId: sale.supplierId,
    category: sale.category,
    brand: sale.brand,
    buyPrice: sale.buyPrice,
    brandingTheme: sale.brandingTheme,
    buyerType: sale.buyerType,
    itemTitle: sale.itemTitle,
    shippingCost: sale.shippingCost,
    cardFees: sale.cardFees,
  });

  // Serialize sale for client
  const saleData = {
    id: sale.id,
    saleReference: sale.saleReference || null,
    xeroInvoiceNumber: sale.xeroInvoiceNumber || null,
    saleDate: sale.saleDate ? sale.saleDate.toISOString() : null,
    saleAmountIncVat: sale.saleAmountIncVat || 0,
    saleAmountExVat: sale.saleAmountExVat || 0,
    currency: sale.currency || "GBP",
    buyerName: sale.buyer?.name || "Unknown",
    buyerId: sale.buyerId || null,
    shopperName: sale.shopper?.name || "Unassigned",
    shopperId: sale.shopperId || null,
    supplierName: sale.supplier?.name || null,
    supplierId: sale.supplierId || null,
    brand: sale.brand || null,
    category: sale.category || null,
    itemTitle: sale.itemTitle || null,
    buyPrice: sale.buyPrice || 0,
    brandingTheme: sale.brandingTheme || null,
    buyerType: sale.buyerType || null,
    shippingCost: sale.shippingCost,
    cardFees: sale.cardFees,
    grossMargin: sale.grossMargin || 0,
    commissionableMargin: sale.commissionableMargin || 0,
  };

  return (
    <CompleteDataClient
      sale={saleData}
      suppliers={allSuppliers}
      completeness={completeness}
      userRole={role}
    />
  );
}
