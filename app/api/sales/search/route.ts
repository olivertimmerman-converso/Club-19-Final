/**
 * Club 19 Sales OS - Sales Search API
 *
 * GET /api/sales/search?q={query}
 *
 * Full-text search across sales: invoice number, sale reference,
 * buyer name, brand, item title. Role-filtered for shoppers.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { db } from "@/db";
import { sales, buyers, shoppers, suppliers } from "@/db/schema";
import { and, or, eq, isNull, ilike, ne, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const role = await getUserRole();

    // Strip "INV-" prefix for invoice number matching
    const cleanQuery = q.replace(/^INV-/i, "");
    const pattern = `%${q}%`;
    const cleanPattern = `%${cleanQuery}%`;

    // Build WHERE conditions
    const baseConditions = [
      isNull(sales.deletedAt),
      ne(sales.source, "xero_import"),
    ];

    // Shoppers only see their own sales
    if (role === "shopper") {
      const shopperRecord = await db.query.shoppers.findFirst({
        where: eq(shoppers.clerkUserId, userId),
      });
      if (!shopperRecord) {
        return NextResponse.json({ results: [] });
      }
      baseConditions.push(eq(sales.shopperId, shopperRecord.id));
    }

    // Search with ILIKE across multiple fields
    const results = await db
      .select({
        id: sales.id,
        sale_reference: sales.saleReference,
        sale_date: sales.saleDate,
        brand: sales.brand,
        category: sales.category,
        item_title: sales.itemTitle,
        buy_price: sales.buyPrice,
        sale_amount_inc_vat: sales.saleAmountIncVat,
        gross_margin: sales.grossMargin,
        xero_invoice_number: sales.xeroInvoiceNumber,
        invoice_status: sales.invoiceStatus,
        currency: sales.currency,
        is_payment_plan: sales.isPaymentPlan,
        payment_plan_instalments: sales.paymentPlanInstalments,
        shipping_cost_confirmed: sales.shippingCostConfirmed,
        has_introducer: sales.hasIntroducer,
        introducer_commission: sales.introducerCommission,
        status: sales.status,
        // Joined fields
        buyer_id: buyers.id,
        buyer_name: buyers.name,
        shopper_id: shoppers.id,
        shopper_name: shoppers.name,
        supplier_id: suppliers.id,
      })
      .from(sales)
      .leftJoin(buyers, eq(sales.buyerId, buyers.id))
      .leftJoin(shoppers, eq(sales.shopperId, shoppers.id))
      .leftJoin(suppliers, eq(sales.supplierId, suppliers.id))
      .where(
        and(
          ...baseConditions,
          or(
            ilike(sales.xeroInvoiceNumber, cleanPattern),
            ilike(sales.saleReference, pattern),
            ilike(buyers.name, pattern),
            ilike(sales.brand, pattern),
            ilike(sales.itemTitle, pattern)
          )
        )
      )
      .orderBy(desc(sales.saleDate))
      .limit(50);

    // Shape results to match the Sale interface used by SalesTableClient
    const shaped = results.map((r) => ({
      id: r.id,
      sale_reference: r.sale_reference,
      sale_date: r.sale_date?.toISOString() ?? null,
      brand: r.brand,
      category: r.category,
      item_title: r.item_title,
      buy_price: r.buy_price,
      sale_amount_inc_vat: r.sale_amount_inc_vat,
      gross_margin: r.gross_margin,
      xero_invoice_number: r.xero_invoice_number,
      invoice_status: r.invoice_status,
      currency: r.currency,
      is_payment_plan: r.is_payment_plan ?? false,
      payment_plan_instalments: r.payment_plan_instalments,
      shipping_cost_confirmed: r.shipping_cost_confirmed,
      has_introducer: r.has_introducer ?? false,
      introducer_commission: r.introducer_commission,
      buyer: r.buyer_id ? { name: r.buyer_name ?? "" } : null,
      shopper: r.shopper_id
        ? { id: r.shopper_id, name: r.shopper_name ?? "" }
        : null,
      supplier: r.supplier_id ? { id: r.supplier_id } : null,
      introducer: null,
    }));

    return NextResponse.json({ results: shaped });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
