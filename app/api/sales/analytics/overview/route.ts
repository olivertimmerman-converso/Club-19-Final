/**
 * Club 19 Sales OS - Sales Analytics Overview API
 *
 * GET /api/sales/analytics/overview
 * Returns high-level KPIs and metrics for dashboard display
 *
 * Admin/Finance/Superadmin only endpoint
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  computePaymentFlags,
  computeOverdueFlags,
  computeMarginMetrics,
  computeAuthenticityRisk,
} from "@/lib/sales-summary-helpers";
import * as logger from "@/lib/logger";

// Drizzle imports
import { db } from "@/db";
import { sales, errors } from "@/db/schema";

// ORIGINAL XATA:
// import { getXataClient } from "@/src/xata";
// import type { SalesRecord } from "@/src/xata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ORIGINAL XATA:
// let _xata: ReturnType<typeof getXataClient> | null = null;
//
// function xata() {
//   if (_xata) return _xata;
//   _xata = getXataClient();
//   return _xata;
// }

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AnalyticsOverview {
  // General KPIs
  total_sales_count: number;
  total_revenue_inc_vat: number;
  total_buy_cost: number;
  total_margin: number;
  average_margin_percent: number;

  // Payment status
  count_paid: number;
  count_unpaid: number;
  count_overdue: number;

  // Buyer type breakdown
  end_client_sales_count: number;
  b2b_sales_count: number;

  // Authenticity tracking
  authenticity_high_risk_count: number;
  authenticity_missing_receipt_count: number;

  // Error tracking
  errors_count_total: number;
  errors_by_group: Record<string, number>;
}

// Helper type for Drizzle result to match SalesRecord shape for helper functions
interface SaleForHelpers {
  id: string;
  status: string | null;
  buyerType: string | null;
  saleAmountIncVat: number | null;
  buyPrice: number | null;
  commissionableMargin: number | null;
  xeroPaymentDate?: Date | null;
  commissionLocked?: boolean | null;
  commissionPaid?: boolean | null;
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(req: NextRequest) {
  logger.info("ANALYTICS", "GET request received");

  // Rate limiting
  const rateLimitResponse = withRateLimit(req, RATE_LIMITS.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // STEP 1: Check authentication and authorization
    const { userId } = await auth();
    if (!userId) {
      logger.error("ANALYTICS", "Unauthorized - no userId");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in" },
        { status: 401 }
      );
    }

    const role = await getUserRole();
    if (!role || (role !== "admin" && role !== "superadmin" && role !== "finance")) {
      logger.error("ANALYTICS", "Forbidden - insufficient permissions", { role });
      return NextResponse.json(
        { error: "Forbidden", message: "Admin/Finance access required" },
        { status: 403 }
      );
    }

    logger.info("ANALYTICS", "Authorized", { role });

    // STEP 2: Fetch all sales
    logger.info("ANALYTICS", "Fetching sales...");

    // ORIGINAL XATA:
    // const sales = await xata()
    //   .db.Sales.select([
    //     "id",
    //     "status",
    //     "buyer_type",
    //     "sale_amount_inc_vat",
    //     "buy_price",
    //     "commissionable_margin",
    //   ])
    //   .getMany();

    // DRIZZLE:
    const salesData = await db
      .select({
        id: sales.id,
        status: sales.status,
        buyerType: sales.buyerType,
        saleAmountIncVat: sales.saleAmountIncVat,
        buyPrice: sales.buyPrice,
        commissionableMargin: sales.commissionableMargin,
      })
      .from(sales);

    logger.info("ANALYTICS", "Found sales", { count: salesData.length });

    // STEP 3: Fetch all errors
    logger.info("ANALYTICS", "Fetching errors...");

    // ORIGINAL XATA:
    // const errors = await xata()
    //   .db.Errors.select(["id"])
    //   .getMany();

    // DRIZZLE:
    const errorsData = await db
      .select({
        id: errors.id,
      })
      .from(errors);

    logger.info("ANALYTICS", "Found errors", { count: errorsData.length });

    // STEP 4: Compute KPIs
    logger.info("ANALYTICS", "Computing KPIs...");

    let total_revenue_inc_vat = 0;
    let total_buy_cost = 0;
    let total_margin = 0;
    let count_paid = 0;
    let count_unpaid = 0;
    let count_overdue = 0;
    let end_client_sales_count = 0;
    let b2b_sales_count = 0;
    let authenticity_high_risk_count = 0;
    let authenticity_missing_receipt_count = 0;

    for (const sale of salesData) {
      // Revenue & costs
      total_revenue_inc_vat += sale.saleAmountIncVat || 0;
      total_buy_cost += sale.buyPrice || 0;
      total_margin += sale.commissionableMargin || 0;

      // Map Drizzle camelCase to snake_case for helper functions
      const saleForHelpers = {
        id: sale.id,
        status: sale.status,
        buyer_type: sale.buyerType,
        sale_amount_inc_vat: sale.saleAmountIncVat,
        buy_price: sale.buyPrice,
        commissionable_margin: sale.commissionableMargin,
      };

      // Payment status
      const paymentFlags = computePaymentFlags(saleForHelpers as any);
      if (paymentFlags.isPaid) {
        count_paid++;
      } else {
        count_unpaid++;
      }

      // Overdue status
      const overdueFlags = computeOverdueFlags(saleForHelpers as any);
      if (overdueFlags.is_overdue) {
        count_overdue++;
      }

      // Buyer type
      if (sale.buyerType === "end_client") {
        end_client_sales_count++;
      } else if (sale.buyerType === "b2b") {
        b2b_sales_count++;
      }

      // Authenticity risk
      const authenticityRisk = computeAuthenticityRisk(saleForHelpers as any);
      if (authenticityRisk === "high_risk") {
        authenticity_high_risk_count++;
      } else if (authenticityRisk === "missing_receipt") {
        authenticity_missing_receipt_count++;
      }
    }

    // Average margin
    const average_margin_percent =
      total_revenue_inc_vat > 0 ? (total_margin / total_revenue_inc_vat) * 100 : 0;

    // Error grouping
    const errors_by_group: Record<string, number> = {};

    // STEP 5: Build response
    const overview: AnalyticsOverview = {
      // General KPIs
      total_sales_count: salesData.length,
      total_revenue_inc_vat,
      total_buy_cost,
      total_margin,
      average_margin_percent,

      // Payment status
      count_paid,
      count_unpaid,
      count_overdue,

      // Buyer type breakdown
      end_client_sales_count,
      b2b_sales_count,

      // Authenticity tracking
      authenticity_high_risk_count,
      authenticity_missing_receipt_count,

      // Error tracking
      errors_count_total: errorsData.length,
      errors_by_group,
    };

    logger.info("ANALYTICS", "Computed analytics");

    // STEP 6: Return response
    return NextResponse.json(overview);
  } catch (error: any) {
    logger.error("ANALYTICS", "Failed to compute analytics", { error });

    return NextResponse.json(
      {
        error: "Failed to compute analytics",
        details: error.message || error,
      },
      { status: 500 }
    );
  }
}
