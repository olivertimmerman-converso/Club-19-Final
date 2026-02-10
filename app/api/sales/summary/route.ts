/**
 * Club 19 Sales OS - Sales Summary API
 *
 * GET /api/sales/summary
 * Returns complete sales data with computed flags, errors, and analytics
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
  type AuthenticityRisk,
} from "@/lib/sales-summary-helpers";
import * as logger from "@/lib/logger";

// Drizzle imports
import { db } from "@/db";
import { sales, errors } from "@/db/schema";
import { desc } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from "@/src/xata";
// import type { SalesRecord, ErrorsRecord } from "@/src/xata";

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

interface ErrorRecord {
  id: string;
  error_type: string;
  error_group: string;
  severity: string;
  source: string;
  message: string[];
  metadata: Record<string, unknown>;
  triggered_by: string;
  timestamp: Date;
  resolved: boolean;
}

interface SaleSummary {
  sale_id: string;
  sale_reference: string;

  // Parties
  buyer_name: string;
  supplier_name: string;
  shopper_name: string;
  introducer_name: string;

  // Classification
  buyer_type: string;
  authenticity_status: string;
  authenticity_risk: AuthenticityRisk;
  supplier_receipt_attached: boolean;

  // Status & Lifecycle
  status: string;
  isPaid: boolean;
  isLocked: boolean;
  canLock: boolean;
  canPayCommission: boolean;

  // Dates
  invoice_due_date: Date | null | undefined;
  xero_payment_date: Date | null | undefined;
  is_overdue: boolean;
  days_overdue: number;

  // Economics
  sale_amount_inc_vat: number;
  buy_price: number;
  commissionable_margin: number;
  commission_amount: number;
  margin_percent: number;

  // Errors
  errors: ErrorRecord[];
  warnings: ErrorRecord[];
  error_groups: Record<string, number>;
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(req: NextRequest) {
  logger.info("SALES_SUMMARY", "GET request received");

  // Rate limiting
  const rateLimitResponse = withRateLimit(req, RATE_LIMITS.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // STEP 1: Check authentication and authorization
    const { userId } = await auth();
    if (!userId) {
      logger.error("SALES_SUMMARY", "Unauthorized - no userId");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in" },
        { status: 401 }
      );
    }

    const role = await getUserRole();
    if (!role || (role !== "admin" && role !== "superadmin" && role !== "finance")) {
      logger.error("SALES_SUMMARY", "Forbidden - insufficient permissions", { role });
      return NextResponse.json(
        { error: "Forbidden", message: "Admin/Finance access required" },
        { status: 403 }
      );
    }

    logger.info("SALES_SUMMARY", "Authorized", { role });

    // STEP 2: Fetch all sales with required fields
    logger.info("SALES_SUMMARY", "Fetching sales...");

    // ORIGINAL XATA:
    // const sales = await xata()
    //   .db.Sales.select([
    //     "id",
    //     "sale_reference",
    //     "status",
    //     "buyer.name",
    //     "supplier.name",
    //     "shopper.name",
    //     "introducer.name",
    //     "buyer_type",
    //     "xero_payment_date",
    //     "commission_amount",
    //     "commission_split_introducer",
    //     "commission_split_shopper",
    //     "commissionable_margin",
    //     "sale_amount_inc_vat",
    //     "buy_price",
    //     "error_flag",
    //     "error_message",
    //   ])
    //   .sort("sale_date", "desc")
    //   .getMany();

    // DRIZZLE:
    const salesData = await db.query.sales.findMany({
      orderBy: [desc(sales.saleDate)],
      with: {
        buyer: true,
        supplier: true,
        shopper: true,
        introducer: true,
      },
    });

    logger.info("SALES_SUMMARY", "Found sales", { count: salesData.length });

    // STEP 3: Fetch all errors (we'll group by sale_id)
    logger.info("SALES_SUMMARY", "Fetching errors...");

    // ORIGINAL XATA:
    // const allErrors = await xata()
    //   .db.Errors.select([
    //     "id",
    //     "sale.id",
    //     "severity",
    //     "source",
    //     "message",
    //     "timestamp",
    //     "resolved",
    //   ])
    //   .getMany();

    // DRIZZLE:
    const allErrors = await db.query.errors.findMany({
      with: {
        sale: true,
      },
    });

    logger.info("SALES_SUMMARY", "Found errors", { count: allErrors.length });

    // Group errors by sale ID
    const errorsBySale = new Map<string, typeof allErrors>();
    for (const error of allErrors) {
      const saleId = error.saleId;
      if (!saleId) continue;

      if (!errorsBySale.has(saleId)) {
        errorsBySale.set(saleId, []);
      }
      errorsBySale.get(saleId)!.push(error);
    }

    // STEP 4: Transform sales into summary format
    logger.info("SALES_SUMMARY", "Computing derived fields...");

    const summaries: SaleSummary[] = salesData.map((sale) => {
      // Map Drizzle camelCase to snake_case for helper functions
      const saleForHelpers = {
        id: sale.id,
        status: sale.status,
        buyer_type: sale.buyerType,
        sale_amount_inc_vat: sale.saleAmountIncVat,
        buy_price: sale.buyPrice,
        commissionable_margin: sale.commissionableMargin,
        xero_payment_date: sale.xeroPaymentDate,
        commission_locked: sale.commissionLocked,
        commission_paid: sale.commissionPaid,
        commission_amount: sale.commissionAmount,
        commission_split_introducer: sale.commissionSplitIntroducer,
        commission_split_shopper: sale.commissionSplitShopper,
      };

      // Compute flags
      const paymentFlags = computePaymentFlags(saleForHelpers as any);
      const overdueFlags = computeOverdueFlags(saleForHelpers as any);
      const marginMetrics = computeMarginMetrics(saleForHelpers as any);
      const authenticityRisk = computeAuthenticityRisk(saleForHelpers as any);

      // Get errors for this sale
      const saleErrors = errorsBySale.get(sale.id) || [];

      // Separate errors and warnings
      const errorRecords: ErrorRecord[] = [];
      const warnings: ErrorRecord[] = [];

      for (const err of saleErrors) {
        const errorRecord: ErrorRecord = {
          id: err.id,
          error_type: "",
          error_group: "",
          severity: err.severity || "",
          source: err.source || "",
          message: err.message || [],
          metadata: {},
          triggered_by: "",
          timestamp: err.timestamp || new Date(),
          resolved: err.resolved || false,
        };

        // Classify as error or warning based on severity
        const severity = err.severity || "";
        if (severity === "low" || severity === "medium") {
          warnings.push(errorRecord);
        } else {
          errorRecords.push(errorRecord);
        }
      }

      // Count errors by group
      const error_groups: Record<string, number> = {};

      return {
        sale_id: sale.id,
        sale_reference: sale.saleReference || "",

        // Parties
        buyer_name: sale.buyer?.name || "",
        supplier_name: sale.supplier?.name || "",
        shopper_name: sale.shopper?.name || "",
        introducer_name: sale.introducer?.name || "",

        // Classification
        buyer_type: sale.buyerType || "",
        authenticity_status: "not_verified",
        authenticity_risk: authenticityRisk,
        supplier_receipt_attached: false,

        // Status & Lifecycle
        status: sale.status || "",
        ...paymentFlags,

        // Dates
        invoice_due_date: undefined,
        xero_payment_date: sale.xeroPaymentDate,
        ...overdueFlags,

        // Economics
        sale_amount_inc_vat: sale.saleAmountIncVat || 0,
        buy_price: sale.buyPrice || 0,
        commissionable_margin: sale.commissionableMargin || 0,
        commission_amount: sale.commissionAmount || 0,
        ...marginMetrics,

        // Errors
        errors: errorRecords,
        warnings,
        error_groups,
      };
    });

    logger.info("SALES_SUMMARY", "Returning sale summaries", { count: summaries.length });

    // STEP 5: Return response
    return NextResponse.json({
      sales: summaries,
      count: summaries.length,
    });
  } catch (error: any) {
    logger.error("SALES_SUMMARY", "Failed to fetch sales summary", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch sales summary",
        details: error.message || error,
      },
      { status: 500 }
    );
  }
}
