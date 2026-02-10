/**
 * Club 19 Sales OS - Monthly Sales Export API
 *
 * GET endpoint for exporting monthly sales data as CSV
 * Used by Founder dashboard to export month data to bookkeeper
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from "next/server";
import { getMonthDateRange } from "@/lib/dateUtils";
import { auth } from "@clerk/nextjs/server";
import * as logger from "@/lib/logger";

// Drizzle imports
import { db } from "@/db";
import { sales, shoppers, buyers, suppliers, introducers } from "@/db/schema";
import { gte, lte, asc, and } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from "@/src/xata";
// const xata = getXataClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get month parameter from URL
    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month") || "current";

    // Get date range for the month
    const dateRange = getMonthDateRange(monthParam);
    if (!dateRange) {
      return NextResponse.json(
        { error: "Invalid month parameter" },
        { status: 400 }
      );
    }

    // ORIGINAL XATA:
    // const sales = await xata.db.Sales.filter({
    //   sale_date: {
    //     $ge: dateRange.start,
    //     $le: dateRange.end,
    //   },
    // })
    //   .select([
    //     "id",
    //     "sale_date",
    //     "sale_reference",
    //     "xero_invoice_number",
    //     "shopper.name",
    //     "buyer.name",
    //     "buyer.id",
    //     "brand",
    //     "category",
    //     "item_title",
    //     "buy_price",
    //     "sale_amount_ex_vat",
    //     "sale_amount_inc_vat",
    //     "shipping_cost",
    //     "direct_costs",
    //     "gross_margin",
    //     "supplier.name",
    //     "supplier.id",
    //     "introducer.name",
    //     "introducer.id",
    //     "internal_notes",
    //     "commissionable_margin",
    //   ])
    //   .sort("sale_date", "asc")
    //   .getAll();

    // DRIZZLE:
    // Use Drizzle's relational query API to fetch sales with relations
    const salesData = await db.query.sales.findMany({
      where: and(
        gte(sales.saleDate, new Date(dateRange.start)),
        lte(sales.saleDate, new Date(dateRange.end))
      ),
      with: {
        shopper: {
          columns: { name: true },
        },
        buyer: {
          columns: { id: true, name: true },
        },
        supplier: {
          columns: { id: true, name: true },
        },
        introducer: {
          columns: { id: true, name: true },
        },
      },
      orderBy: [asc(sales.saleDate)],
    });

    // Generate CSV content
    const csvHeaders = [
      "date",
      "invoice_number",
      "salesperson",
      "client_name",
      "brand",
      "category",
      "item_description",
      "buy_price_gbp",
      "sell_price_gbp",
      "vat_amount",
      "shipping_cost",
      "direct_costs",
      "margin_gbp",
      "margin_percent",
      "commission_due",
      "supplier",
      "referrer",
      "notes",
    ];

    const csvRows = salesData.map((sale) => {
      const saleDate = sale.saleDate
        ? new Date(sale.saleDate).toLocaleDateString("en-GB")
        : "";
      const vatAmount = (sale.saleAmountIncVat || 0) - (sale.saleAmountExVat || 0);
      const marginPercent =
        sale.saleAmountIncVat && sale.saleAmountIncVat > 0
          ? ((sale.grossMargin || 0) / sale.saleAmountIncVat) * 100
          : 0;

      return [
        saleDate,
        sale.xeroInvoiceNumber || sale.saleReference || "",
        sale.shopper?.name || "",
        sale.buyer?.name || "",
        sale.brand || "",
        sale.category || "",
        sale.itemTitle || "",
        (sale.buyPrice || 0).toFixed(2),
        (sale.saleAmountExVat || 0).toFixed(2),
        vatAmount.toFixed(2),
        (sale.shippingCost || 0).toFixed(2),
        (sale.directCosts || 0).toFixed(2),
        (sale.grossMargin || 0).toFixed(2),
        marginPercent.toFixed(2),
        (sale.commissionableMargin || 0).toFixed(2),
        sale.supplier?.name || "",
        sale.introducer?.name || "",
        `"${(sale.internalNotes || "").replace(/"/g, '""')}"`, // Escape quotes in notes
      ];
    });

    // Build CSV string
    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Generate filename with month and year
    const monthDate = new Date(dateRange.start);
    const monthName = monthDate
      .toLocaleDateString("en-GB", { month: "short" })
      .toUpperCase();
    const year = monthDate.getFullYear();
    const filename = `C19_SALES_${monthName}_${year}.csv`;

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("EXPORT", "Error exporting monthly sales", { error: error as any });
    return NextResponse.json(
      { error: "Failed to export sales data" },
      { status: 500 }
    );
  }
}
