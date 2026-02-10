/**
 * Club 19 Sales OS - Margin Recalculation Endpoint
 *
 * Recalculates gross_margin and commissionable_margin for all sales records
 * using the SINGLE SOURCE OF TRUTH in lib/economics.ts
 *
 * This endpoint can be used to fix historical margin calculation bugs.
 * It uses the correct formulas:
 * - Gross Margin = Sale Price (ex VAT) - Buy Price ONLY
 * - Commissionable Margin = Gross Margin - Shipping - Card Fees - Direct Costs - Introducer Commission
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { calculateMargins, toNumber } from "@/lib/economics";
import { getUserRole } from "@/lib/getUserRole";
import * as logger from "@/lib/logger";

// Drizzle imports
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq, isNull, inArray } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from "@/src/xata";
// const xata = getXataClient();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET handler for testing that the route is reachable
export async function GET() {
  return NextResponse.json({
    message: "Recalculate margins endpoint is working",
    usage: "Send a POST request with optional body: { dryRun: boolean, saleIds?: string[] }",
    note: "dryRun defaults to true for safety",
  });
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Allow": "GET, POST, OPTIONS",
    },
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const role = await getUserRole();
    if (!["superadmin", "operations", "founder"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse options from request
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety
    const saleIds = body.saleIds as string[] | undefined; // Optional: specific sales to recalculate

    logger.info("RECALC_MARGINS", "Starting margin recalculation", {
      dryRun,
      specificSales: saleIds?.length || "all",
    });

    // Fetch sales to recalculate
    let salesData;
    if (saleIds && saleIds.length > 0) {
      // ORIGINAL XATA:
      // sales = await Promise.all(
      //   saleIds.map((id) => xata.db.Sales.read(id))
      // );
      // sales = sales.filter(Boolean);

      // DRIZZLE:
      salesData = await db
        .select({
          id: sales.id,
          saleReference: sales.saleReference,
          saleAmountExVat: sales.saleAmountExVat,
          buyPrice: sales.buyPrice,
          shippingCost: sales.shippingCost,
          cardFees: sales.cardFees,
          directCosts: sales.directCosts,
          commissionSplitIntroducer: sales.commissionSplitIntroducer,
          grossMargin: sales.grossMargin,
          commissionableMargin: sales.commissionableMargin,
          status: sales.status,
        })
        .from(sales)
        .where(inArray(sales.id, saleIds));
    } else {
      // ORIGINAL XATA:
      // sales = await xata.db.Sales.filter({
      //   deleted_at: { $is: null },
      // })
      //   .select([
      //     "id",
      //     "sale_reference",
      //     "sale_amount_ex_vat",
      //     "buy_price",
      //     "shipping_cost",
      //     "card_fees",
      //     "direct_costs",
      //     "commission_split_introducer",
      //     "gross_margin",
      //     "commissionable_margin",
      //     "status",
      //   ])
      //   .getAll();

      // DRIZZLE:
      salesData = await db
        .select({
          id: sales.id,
          saleReference: sales.saleReference,
          saleAmountExVat: sales.saleAmountExVat,
          buyPrice: sales.buyPrice,
          shippingCost: sales.shippingCost,
          cardFees: sales.cardFees,
          directCosts: sales.directCosts,
          commissionSplitIntroducer: sales.commissionSplitIntroducer,
          grossMargin: sales.grossMargin,
          commissionableMargin: sales.commissionableMargin,
          status: sales.status,
        })
        .from(sales)
        .where(isNull(sales.deletedAt));
    }

    logger.info("RECALC_MARGINS", `Found ${salesData.length} sales to process`);

    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      changes: [] as Array<{
        id: string;
        reference: string;
        status: string | null | undefined;
        oldGrossMargin: number | null | undefined;
        newGrossMargin: number;
        oldCommissionableMargin: number | null | undefined;
        newCommissionableMargin: number;
        inputs: {
          saleAmountExVat: number;
          buyPrice: number;
        };
      }>,
      errorDetails: [] as Array<{ id: string; error: string }>,
    };

    for (const sale of salesData) {
      if (!sale) continue;

      try {
        results.processed++;

        // Calculate correct margins using SINGLE SOURCE OF TRUTH
        const marginResult = calculateMargins({
          saleAmountExVat: sale.saleAmountExVat,
          buyPrice: sale.buyPrice,
          shippingCost: sale.shippingCost,
          cardFees: sale.cardFees,
          directCosts: sale.directCosts,
          introducerCommission: sale.commissionSplitIntroducer,
        });

        const oldGrossMargin = toNumber(sale.grossMargin);
        const oldCommissionableMargin = toNumber(sale.commissionableMargin);
        const newGrossMargin = marginResult.grossMargin;
        const newCommissionableMargin = marginResult.commissionableMargin;

        // Check if values differ (allowing for floating point precision)
        const grossDiff = Math.abs(oldGrossMargin - newGrossMargin);
        const commDiff = Math.abs(oldCommissionableMargin - newCommissionableMargin);

        if (grossDiff > 0.01 || commDiff > 0.01) {
          results.changes.push({
            id: sale.id,
            reference: sale.saleReference || sale.id,
            status: sale.status,
            oldGrossMargin: sale.grossMargin,
            newGrossMargin,
            oldCommissionableMargin: sale.commissionableMargin,
            newCommissionableMargin,
            inputs: {
              saleAmountExVat: marginResult.breakdown.saleAmountExVat,
              buyPrice: marginResult.breakdown.buyPrice,
            },
          });

          // Update if not dry run
          if (!dryRun) {
            // ORIGINAL XATA:
            // await xata.db.Sales.update(sale.id, {
            //   gross_margin: newGrossMargin,
            //   commissionable_margin: newCommissionableMargin,
            // });

            // DRIZZLE:
            await db
              .update(sales)
              .set({
                grossMargin: newGrossMargin,
                commissionableMargin: newCommissionableMargin,
              })
              .where(eq(sales.id, sale.id));

            results.updated++;

            logger.info("RECALC_MARGINS", "Updated sale margins", {
              saleId: sale.id,
              reference: sale.saleReference,
              oldGross: oldGrossMargin,
              newGross: newGrossMargin,
              oldComm: oldCommissionableMargin,
              newComm: newCommissionableMargin,
            });
          }
        } else {
          results.skipped++;
        }
      } catch (error: any) {
        results.errors++;
        results.errorDetails.push({
          id: sale.id,
          error: error.message || "Unknown error",
        });
        logger.error("RECALC_MARGINS", "Error processing sale", {
          saleId: sale.id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info("RECALC_MARGINS", "Recalculation complete", {
      ...results,
      changes: results.changes.length,
      duration,
    });

    return NextResponse.json({
      success: true,
      dryRun,
      duration,
      summary: {
        processed: results.processed,
        needsUpdate: results.changes.length,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors,
      },
      changes: results.changes,
      errorDetails: results.errorDetails.length > 0 ? results.errorDetails : undefined,
    });
  } catch (error: any) {
    logger.error("RECALC_MARGINS", "Fatal error", { error: error.message });
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
