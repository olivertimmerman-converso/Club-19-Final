/**
 * Club 19 Sales OS - Errors API
 *
 * GET /api/errors
 * Fetch errors with optional filters
 *
 * Admin-only endpoint for error management
 */

import { NextRequest, NextResponse } from "next/server";
// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
import { db } from "@/db";
import { errors, sales } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
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
// GET HANDLER
// ============================================================================

export async function GET(req: NextRequest) {
  logger.info("ERRORS", "GET request received");

  // STEP 0: Rate limiting
  const rateLimitResponse = withRateLimit(req, RATE_LIMITS.errors);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // STEP 1: Check authentication and authorization
    const { userId } = await auth();
    if (!userId) {
      logger.error("ERRORS", "Unauthorized - no userId");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in" },
        { status: 401 }
      );
    }

    const role = await getUserRole();
    if (!role || (role !== "admin" && role !== "superadmin" && role !== "finance")) {
      logger.error("ERRORS", "Forbidden - insufficient permissions", { role });
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    logger.info("ERRORS", "Authorized", { role });

    // STEP 2: Parse query parameters
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type");
    const severity = searchParams.get("severity");
    const saleId = searchParams.get("saleId");
    const resolved = searchParams.get("resolved");
    const triggeredBy = searchParams.get("triggeredBy");

    logger.info("ERRORS", "Filters applied", {
      type,
      severity,
      saleId,
      resolved,
      triggeredBy,
    });

    // STEP 2: Build query with filters
    // ORIGINAL XATA:
    // let query = xata().db.Errors.select([
    //   "id",
    //   "sale.id",
    //   "sale.sale_reference",
    //   "sale.brand",
    //   "sale.category",
    //   "severity",
    //   "source",
    //   "message",
    //   "timestamp",
    //   "resolved",
    //   "resolved_by",
    // ]);

    // Build filter conditions
    const conditions = [];

    // Note: error_type and triggered_by fields don't exist in schema, removed filter logic

    if (severity) {
      conditions.push(eq(errors.severity, severity));
    }

    if (saleId) {
      conditions.push(eq(errors.saleId, saleId));
    }

    if (resolved !== null && resolved !== undefined) {
      conditions.push(eq(errors.resolved, resolved === "true"));
    }

    // ORIGINAL XATA:
    // // Apply filters if any exist
    // if (Object.keys(filters).length > 0) {
    //   query = query.filter(filters);
    // }
    // // STEP 3: Fetch errors
    // const errors = await query.sort("timestamp", "desc").getMany();

    // Execute Drizzle query with joins
    const errorRecords = await db
      .select({
        id: errors.id,
        saleId: errors.saleId,
        saleReference: sales.saleReference,
        brand: sales.brand,
        category: sales.category,
        severity: errors.severity,
        source: errors.source,
        message: errors.message,
        timestamp: errors.timestamp,
        resolved: errors.resolved,
        resolvedBy: errors.resolvedBy,
      })
      .from(errors)
      .leftJoin(sales, eq(errors.saleId, sales.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(errors.timestamp));

    // Transform results to match original format with nested sale object
    const transformedErrors = errorRecords.map((err) => ({
      id: err.id,
      sale: err.saleId
        ? {
            id: err.saleId,
            sale_reference: err.saleReference,
            brand: err.brand,
            category: err.category,
          }
        : null,
      severity: err.severity,
      source: err.source,
      message: err.message,
      timestamp: err.timestamp,
      resolved: err.resolved,
      resolved_by: err.resolvedBy,
    }));

    logger.info("ERRORS", `Found ${transformedErrors.length} errors`);

    // STEP 4: Return response
    return NextResponse.json({
      errors: transformedErrors,
      count: transformedErrors.length,
    });
  } catch (error: any) {
    logger.error("ERRORS", "Failed to fetch errors", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch errors",
        details: error.message || error,
      },
      { status: 500 }
    );
  }
}
