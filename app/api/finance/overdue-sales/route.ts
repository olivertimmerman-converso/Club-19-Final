/**
 * Club 19 Sales OS - Overdue Sales API
 *
 * GET /api/finance/overdue-sales
 * Lists sales past their invoice_due_date with key financial details
 *
 * Admin/Finance/Superadmin only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
// ORIGINAL XATA: import type { SalesRecord } from "@/src/xata";
import { db } from "@/db";
import { sales, errors, shoppers, buyers } from "@/db/schema";
import type { Sale } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  computePaymentFlags,
  computeOverdueFlags,
} from "@/lib/sales-summary-helpers";
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

interface ErrorSummary {
  error_id: string;
  error_type: string;
  error_group: string;
  severity: string;
  message: string[];
}

interface OverdueSale {
  sale_id: string;
  sale_reference: string;
  buyer_name: string;
  shopper_name: string;
  sale_amount_inc_vat: number;
  invoice_due_date: Date | null | undefined;
  days_overdue: number;
  isPaid: boolean;
  status: string;
  errors: ErrorSummary[];
}

interface OverdueSalesResponse {
  total_overdue: number;
  overdue_sales: OverdueSale[];
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(req: NextRequest) {
  logger.info("OVERDUE_SALES", "GET request received");

  // Rate limiting
  const rateLimitResponse = withRateLimit(req, RATE_LIMITS.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // STEP 1: Check authentication and authorization
    const { userId } = await auth();
    if (!userId) {
      logger.error("OVERDUE_SALES", "Unauthorized - no userId");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in" },
        { status: 401 }
      );
    }

    const role = await getUserRole();
    if (!role || (role !== "admin" && role !== "superadmin" && role !== "finance")) {
      logger.error("OVERDUE_SALES", "Forbidden - insufficient permissions", { role });
      return NextResponse.json(
        { error: "Forbidden", message: "Admin/Finance access required" },
        { status: 403 }
      );
    }

    logger.info("OVERDUE_SALES", "Authorized", { role });

    // STEP 2: Fetch all sales with required fields
    logger.info("OVERDUE_SALES", "Fetching sales...");

    // ORIGINAL XATA:
    // const sales = await xata()
    //   .db.Sales.select([
    //     "id",
    //     "sale_reference",
    //     "status",
    //     "buyer.name",
    //     "shopper.name",
    //     "sale_amount_inc_vat",
    //   ])
    //   .getMany();
    const salesRecords = await db
      .select({
        id: sales.id,
        saleReference: sales.saleReference,
        status: sales.status,
        buyerId: sales.buyerId,
        shopperId: sales.shopperId,
        saleAmountIncVat: sales.saleAmountIncVat,
        buyerName: buyers.name,
        shopperName: shoppers.name,
      })
      .from(sales)
      .leftJoin(buyers, eq(sales.buyerId, buyers.id))
      .leftJoin(shoppers, eq(sales.shopperId, shoppers.id));

    logger.info("OVERDUE_SALES", `Found ${salesRecords.length} sales`);

    // STEP 3: Filter for overdue sales and compute flags
    logger.info("OVERDUE_SALES", "Computing overdue flags...");

    const overdueSales: OverdueSale[] = [];

    for (const sale of salesRecords) {
      // Convert to format expected by helper functions
      const saleForHelper = {
        id: sale.id,
        sale_reference: sale.saleReference,
        status: sale.status,
        sale_amount_inc_vat: sale.saleAmountIncVat,
      } as any;

      const paymentFlags = computePaymentFlags(saleForHelper);
      const overdueFlags = computeOverdueFlags(saleForHelper);

      // Only include sales that are overdue
      if (overdueFlags.is_overdue) {
        overdueSales.push({
          sale_id: sale.id,
          sale_reference: sale.saleReference || "",
          buyer_name: sale.buyerName || "",
          shopper_name: sale.shopperName || "",
          sale_amount_inc_vat: sale.saleAmountIncVat || 0,
          invoice_due_date: undefined,
          days_overdue: overdueFlags.days_overdue,
          isPaid: paymentFlags.isPaid,
          status: sale.status || "",
          errors: [], // Will populate in next step
        });
      }
    }

    logger.info("OVERDUE_SALES", `Found ${overdueSales.length} overdue sales`);

    // STEP 4: Fetch errors for overdue sales
    if (overdueSales.length > 0) {
      logger.info("OVERDUE_SALES", "Fetching errors for overdue sales...");

      const overdueSaleIds = overdueSales.map((s) => s.sale_id);

      // ORIGINAL XATA:
      // const errors = await xata()
      //   .db.Errors.filter({
      //     "sale.id": { $any: overdueSaleIds },
      //   })
      //   .select([
      //     "id",
      //     "sale.id",
      //     "severity",
      //     "message",
      //   ])
      //   .getMany();
      const errorRecords = await db
        .select({
          id: errors.id,
          saleId: errors.saleId,
          severity: errors.severity,
          message: errors.message,
        })
        .from(errors)
        .where(inArray(errors.saleId, overdueSaleIds));

      logger.info("OVERDUE_SALES", `Found ${errorRecords.length} errors`);

      // Group errors by sale_id
      const errorsBySale = new Map<string, typeof errorRecords>();
      for (const error of errorRecords) {
        const saleId = error.saleId;
        if (!saleId) continue;

        if (!errorsBySale.has(saleId)) {
          errorsBySale.set(saleId, []);
        }
        errorsBySale.get(saleId)!.push(error);
      }

      // Attach errors to overdue sales
      for (const sale of overdueSales) {
        const saleErrors = errorsBySale.get(sale.sale_id) || [];
        sale.errors = saleErrors.map((err) => ({
          error_id: err.id,
          error_type: "",
          error_group: "",
          severity: err.severity || "",
          message: err.message || [],
        }));
      }
    }

    // STEP 5: Return response
    const response: OverdueSalesResponse = {
      total_overdue: overdueSales.length,
      overdue_sales: overdueSales,
    };

    logger.info("OVERDUE_SALES", `Returning ${overdueSales.length} overdue sales`);

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error("OVERDUE_SALES", "Failed to fetch overdue sales", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch overdue sales",
        details: error.message || error,
      },
      { status: 500 }
    );
  }
}
