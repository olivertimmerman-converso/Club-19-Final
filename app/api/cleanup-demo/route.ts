/**
 * Club 19 Sales OS - Demo Data Cleanup Route
 *
 * One-time cleanup script to remove demo data from the database
 * Run once, then delete this file
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/getUserRole";
import * as logger from "@/lib/logger";

// Drizzle imports
import { db } from "@/db";
import { sales, shoppers, buyers, suppliers } from "@/db/schema";
import { eq, like, inArray } from "drizzle-orm";

// ORIGINAL XATA:
// import { XataClient } from "@/src/xata";
// const xata = new XataClient();

export async function POST(request: NextRequest) {
  try {
    // Check user role - superadmin only
    const role = await getUserRole();
    if (role !== "superadmin") {
      return NextResponse.json(
        { error: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    logger.info("CLEANUP", "Starting cleanup...");

    const summary = {
      salesDeleted: 0,
      shoppersDeleted: 0,
      buyersDeleted: 0,
      suppliersDeleted: 0,
    };

    // ORIGINAL XATA:
    // const demoSales = await xata.db.Sales
    //   .filter({
    //     xero_invoice_number: { $startsWith: "DEMO-" }
    //   })
    //   .getAll();
    // for (const sale of demoSales) {
    //   await xata.db.Sales.delete(sale.id);
    //   summary.salesDeleted++;
    // }

    // DRIZZLE:
    // 1. Delete demo Sales (where xero_invoice_number starts with "DEMO-")
    const demoSales = await db
      .select({ id: sales.id })
      .from(sales)
      .where(like(sales.xeroInvoiceNumber, "DEMO-%"));

    if (demoSales.length > 0) {
      await db
        .delete(sales)
        .where(like(sales.xeroInvoiceNumber, "DEMO-%"));
      summary.salesDeleted = demoSales.length;
    }
    logger.info("CLEANUP", "Deleted demo sales", { count: summary.salesDeleted });

    // ORIGINAL XATA:
    // const demoShoppers = await xata.db.Shoppers
    //   .filter({
    //     email: { $any: ["hope@club19london.com", "mc@club19london.com"] }
    //   })
    //   .getAll();
    // for (const shopper of demoShoppers) {
    //   await xata.db.Shoppers.delete(shopper.id);
    //   summary.shoppersDeleted++;
    // }

    // DRIZZLE:
    // 2. Delete demo Shoppers (Hope and MC)
    const demoShopperEmails = ["hope@club19london.com", "mc@club19london.com"];
    const demoShoppers = await db
      .select({ id: shoppers.id })
      .from(shoppers)
      .where(inArray(shoppers.email, demoShopperEmails));

    if (demoShoppers.length > 0) {
      await db
        .delete(shoppers)
        .where(inArray(shoppers.email, demoShopperEmails));
      summary.shoppersDeleted = demoShoppers.length;
    }
    logger.info("CLEANUP", "Deleted demo shoppers", { count: summary.shoppersDeleted });

    // ORIGINAL XATA:
    // const demoBuyers = await xata.db.Buyers
    //   .filter({
    //     name: { $any: ["Sarah Mitchell", "Emma Thompson", "Victoria Chen"] }
    //   })
    //   .getAll();
    // for (const buyer of demoBuyers) {
    //   await xata.db.Buyers.delete(buyer.id);
    //   summary.buyersDeleted++;
    // }

    // DRIZZLE:
    // 3. Delete demo Buyers (except Bettina Looney)
    const demoBuyerNames = ["Sarah Mitchell", "Emma Thompson", "Victoria Chen"];
    const demoBuyers = await db
      .select({ id: buyers.id })
      .from(buyers)
      .where(inArray(buyers.name, demoBuyerNames));

    if (demoBuyers.length > 0) {
      await db
        .delete(buyers)
        .where(inArray(buyers.name, demoBuyerNames));
      summary.buyersDeleted = demoBuyers.length;
    }
    logger.info("CLEANUP", "Deleted demo buyers", { count: summary.buyersDeleted });

    // ORIGINAL XATA:
    // const demoSuppliers = await xata.db.Suppliers
    //   .filter({
    //     name: { $any: ["Private Seller - London", "Auction House Paris"] }
    //   })
    //   .getAll();
    // for (const supplier of demoSuppliers) {
    //   await xata.db.Suppliers.delete(supplier.id);
    //   summary.suppliersDeleted++;
    // }

    // DRIZZLE:
    // 4. Delete demo Suppliers
    const demoSupplierNames = ["Private Seller - London", "Auction House Paris"];
    const demoSuppliers = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(inArray(suppliers.name, demoSupplierNames));

    if (demoSuppliers.length > 0) {
      await db
        .delete(suppliers)
        .where(inArray(suppliers.name, demoSupplierNames));
      summary.suppliersDeleted = demoSuppliers.length;
    }
    logger.info("CLEANUP", "Deleted demo suppliers", { count: summary.suppliersDeleted });

    logger.info("CLEANUP", "Cleanup complete", summary);

    return NextResponse.json({
      success: true,
      message: "Demo data cleanup complete",
      summary,
    });

  } catch (error) {
    logger.error("CLEANUP", "Failed to cleanup demo data", { error: error as any });
    return NextResponse.json(
      {
        error: "Failed to cleanup demo data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
