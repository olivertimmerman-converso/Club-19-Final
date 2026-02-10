/**
 * Club 19 Sales OS - Daily Maintenance Cron API
 *
 * POST /api/finance/daily-maintenance
 * Daily maintenance tasks for sales data integrity
 *
 * Designed to run at 07:00 UK time via Vercel Cron or external scheduler
 * Requires x-system-key header for token-based authentication
 * Superadmin role also allowed for manual execution
 */

import { NextRequest, NextResponse } from "next/server";
// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
// ORIGINAL XATA: import type { SalesRecord } from "@/src/xata";
import { db } from "@/db";
import { sales, errors } from "@/db/schema";
import type { Sale } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  computePaymentFlags,
  computeOverdueFlags,
  computeMarginMetrics,
  computeAuthenticityRisk,
} from "@/lib/sales-summary-helpers";
import { ERROR_TYPES, ERROR_TRIGGERED_BY, ERROR_GROUPS } from "@/lib/error-types";
import * as logger from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// ORIGINAL XATA CLIENT (REMOVED)
// ============================================================================

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

interface DailyMaintenanceResponse {
  total_sales: number;
  total_overdue_identified: number;
  total_warnings_created: number;
  overdue_sales: Array<{
    sale_id: string;
    sale_reference: string;
    days_overdue: number;
  }>;
  warnings_created: Array<{
    sale_id: string;
    sale_reference: string;
    warning_type: string;
    message: string;
  }>;
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  logger.info("MAINTENANCE", "POST request received");

  // Rate limiting
  const rateLimitResponse = withRateLimit(req, RATE_LIMITS.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // STEP 1: Check authentication - token-based OR superadmin
    const systemKey = req.headers.get("x-system-key");
    const expectedKey = process.env.SYSTEM_MAINTENANCE_KEY;

    let isAuthorized = false;
    let authMethod = "";

    // Option 1: Token-based authentication
    if (systemKey && expectedKey && systemKey === expectedKey) {
      isAuthorized = true;
      authMethod = "system-token";
      logger.info("MAINTENANCE", "Authorized via system token");
    } else {
      // Option 2: Superadmin role authentication
      const { userId } = await auth();
      if (userId) {
        const role = await getUserRole();
        if (role === "superadmin") {
          isAuthorized = true;
          authMethod = "superadmin";
          logger.info("MAINTENANCE", "Authorized via superadmin role");
        }
      }
    }

    if (!isAuthorized) {
      logger.error("MAINTENANCE", "Unauthorized - invalid token or insufficient permissions");
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid system key or superadmin role required" },
        { status: 401 }
      );
    }

    // STEP 2: Fetch all sales with required fields
    logger.info("MAINTENANCE", "Fetching sales...");

    // ORIGINAL XATA:
    // const sales = await xata()
    //   .db.Sales.select([
    //     "id",
    //     "sale_reference",
    //     "status",
    //     "sale_amount_inc_vat",
    //     "buy_price",
    //     "commissionable_margin",
    //   ])
    //   .getMany();
    const salesRecords = await db
      .select({
        id: sales.id,
        saleReference: sales.saleReference,
        status: sales.status,
        saleAmountIncVat: sales.saleAmountIncVat,
        buyPrice: sales.buyPrice,
        commissionableMargin: sales.commissionableMargin,
      })
      .from(sales);

    logger.info("MAINTENANCE", `Found ${salesRecords.length} sales`);

    // STEP 3: Task 1 - Flag overdue sales
    logger.info("MAINTENANCE", "Task 1: Flagging overdue sales...");

    const overdueSales: Array<{
      sale_id: string;
      sale_reference: string;
      days_overdue: number;
    }> = [];

    for (const sale of salesRecords) {
      // Convert to format expected by helper functions
      const saleForHelper = {
        id: sale.id,
        sale_reference: sale.saleReference,
        status: sale.status,
        sale_amount_inc_vat: sale.saleAmountIncVat,
        buy_price: sale.buyPrice,
        commissionable_margin: sale.commissionableMargin,
      } as any;

      const overdueFlags = computeOverdueFlags(saleForHelper);
      if (overdueFlags.is_overdue) {
        overdueSales.push({
          sale_id: sale.id,
          sale_reference: sale.saleReference || "",
          days_overdue: overdueFlags.days_overdue,
        });
      }
    }

    logger.info("MAINTENANCE", `Task 1 complete - ${overdueSales.length} overdue sales identified`);

    // STEP 4: Task 2 - Generate economics warnings
    logger.info("MAINTENANCE", "Task 2: Generating economics warnings...");

    const warningsCreated: Array<{
      sale_id: string;
      sale_reference: string;
      warning_type: string;
      message: string;
    }> = [];

    for (const sale of salesRecords) {
      const warnings: Array<{ type: string; message: string }> = [];

      // Convert to format expected by helper functions
      const saleForHelper = {
        id: sale.id,
        sale_reference: sale.saleReference,
        status: sale.status,
        sale_amount_inc_vat: sale.saleAmountIncVat,
        buy_price: sale.buyPrice,
        commissionable_margin: sale.commissionableMargin,
      } as any;

      // Warning 1: Negative margin
      const marginMetrics = computeMarginMetrics(saleForHelper);
      if (marginMetrics.margin_percent < 0) {
        warnings.push({
          type: "negative_margin",
          message: `Negative margin detected: ${marginMetrics.margin_percent.toFixed(2)}%`,
        });
      }

      // Warning 2: Suspiciously high margin (>200%)
      if (marginMetrics.margin_percent > 200) {
        warnings.push({
          type: "high_margin",
          message: `Unusually high margin detected: ${marginMetrics.margin_percent.toFixed(2)}%`,
        });
      }

      // Warning 3: Zero sale amount
      if ((sale.saleAmountIncVat || 0) === 0) {
        warnings.push({
          type: "zero_sale_amount",
          message: "Sale amount is zero",
        });
      }

      // Warning 4: Buy price exceeds sale amount
      if ((sale.buyPrice || 0) > (sale.saleAmountIncVat || 0)) {
        warnings.push({
          type: "buy_exceeds_sale",
          message: `Buy price (${sale.buyPrice}) exceeds sale amount (${sale.saleAmountIncVat})`,
        });
      }

      // Create error records for each warning
      for (const warning of warnings) {
        try {
          // ORIGINAL XATA:
          // await xata().db.Errors.create({
          //   sale: sale.id,
          //   severity: "medium",
          //   source: "daily-maintenance",
          //   message: [warning.message],
          //   timestamp: new Date(),
          //   resolved: false,
          // });
          await db.insert(errors).values({
            saleId: sale.id,
            severity: "medium",
            source: "daily-maintenance",
            message: [warning.message],
            timestamp: new Date(),
            resolved: false,
          });

          warningsCreated.push({
            sale_id: sale.id,
            sale_reference: sale.saleReference || "",
            warning_type: warning.type,
            message: warning.message,
          });

          logger.warn("MAINTENANCE", "Warning created", {
            saleReference: sale.saleReference,
            warningType: warning.type
          });
        } catch (createErr) {
          logger.error("MAINTENANCE", "Failed to create warning", {
            saleId: sale.id,
            error: createErr as any
          });
        }
      }
    }

    logger.info("MAINTENANCE", `Task 2 complete - ${warningsCreated.length} warnings created`);

    // STEP 5: Task 3 - Recompute authenticity risk
    logger.info("MAINTENANCE", "Task 3: Recomputing authenticity risk...");

    let authenticityWarningsCreated = 0;

    for (const sale of salesRecords) {
      // Convert to format expected by helper functions
      const saleForHelper = {
        id: sale.id,
        sale_reference: sale.saleReference,
        status: sale.status,
        sale_amount_inc_vat: sale.saleAmountIncVat,
        buy_price: sale.buyPrice,
        commissionable_margin: sale.commissionableMargin,
      } as any;

      const authenticityRisk = computeAuthenticityRisk(saleForHelper);

      // Create warning for high-risk items
      if (authenticityRisk === "high_risk") {
        try {
          // ORIGINAL XATA:
          // await xata().db.Errors.create({
          //   sale: sale.id,
          //   severity: "high",
          //   source: "daily-maintenance",
          //   message: ["Authenticity verification not performed - high risk"],
          //   timestamp: new Date(),
          //   resolved: false,
          // });
          await db.insert(errors).values({
            saleId: sale.id,
            severity: "high",
            source: "daily-maintenance",
            message: ["Authenticity verification not performed - high risk"],
            timestamp: new Date(),
            resolved: false,
          });

          authenticityWarningsCreated++;
          warningsCreated.push({
            sale_id: sale.id,
            sale_reference: sale.saleReference || "",
            warning_type: "authenticity_high_risk",
            message: "Authenticity verification not performed - high risk",
          });

          logger.warn("MAINTENANCE", "Authenticity warning created", {
            saleReference: sale.saleReference
          });
        } catch (createErr) {
          logger.error("MAINTENANCE", "Failed to create authenticity warning", {
            saleId: sale.id,
            error: createErr as any
          });
        }
      }
    }

    logger.info("MAINTENANCE", `Task 3 complete - ${authenticityWarningsCreated} authenticity warnings created`);

    // STEP 6: Build and return response
    const response: DailyMaintenanceResponse = {
      total_sales: salesRecords.length,
      total_overdue_identified: overdueSales.length,
      total_warnings_created: warningsCreated.length,
      overdue_sales: overdueSales,
      warnings_created: warningsCreated,
    };

    logger.info("MAINTENANCE", "Complete", {
      authMethod,
      overdue: overdueSales.length,
      warnings: warningsCreated.length
    });

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error("MAINTENANCE", "Unexpected error", { error });

    return NextResponse.json(
      {
        error: "Failed to run daily maintenance",
        details: error.message || error,
      },
      { status: 500 }
    );
  }
}
