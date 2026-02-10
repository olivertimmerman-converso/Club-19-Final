/**
 * Club 19 Sales OS - Error Groups API
 *
 * GET /api/errors/groups
 * Returns error summaries grouped by type, group, and severity
 *
 * Admin/Finance/Superadmin only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
import { db } from "@/db";
import { errors } from "@/db/schema";
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
// TYPE DEFINITIONS
// ============================================================================

interface ErrorGroupsSummary {
  total_errors: number;
  unresolved_errors: number;
  errors_by_source: Record<string, number>;
  errors_by_severity: Record<string, number>;
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(req: NextRequest) {
  logger.info("ERROR_GROUPS", "GET request received");

  // Rate limiting
  const rateLimitResponse = withRateLimit(req, RATE_LIMITS.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // STEP 1: Check authentication and authorization
    const { userId } = await auth();
    if (!userId) {
      logger.error("ERROR_GROUPS", "Unauthorized - no userId");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in" },
        { status: 401 }
      );
    }

    const role = await getUserRole();
    if (!role || (role !== "admin" && role !== "superadmin" && role !== "finance")) {
      logger.error("ERROR_GROUPS", "Forbidden - insufficient permissions", { role });
      return NextResponse.json(
        { error: "Forbidden", message: "Admin/Finance access required" },
        { status: 403 }
      );
    }

    logger.info("ERROR_GROUPS", "Authorized", { role });

    // STEP 2: Fetch all errors with minimal fields
    logger.info("ERROR_GROUPS", "Fetching errors...");

    // ORIGINAL XATA:
    // const errors = await xata()
    //   .db.Errors.select(["id", "source", "severity", "resolved"])
    //   .getMany();
    const errorRecords = await db
      .select({
        id: errors.id,
        source: errors.source,
        severity: errors.severity,
        resolved: errors.resolved,
      })
      .from(errors);

    logger.info("ERROR_GROUPS", `Found ${errorRecords.length} errors`);

    // STEP 3: Compute summaries
    let total_errors = errorRecords.length;
    let unresolved_errors = 0;
    const errors_by_source: Record<string, number> = {};
    const errors_by_severity: Record<string, number> = {};

    for (const error of errorRecords) {
      // Count unresolved
      if (!error.resolved) {
        unresolved_errors++;
      }

      // Group by source
      const source = error.source || "unknown";
      errors_by_source[source] = (errors_by_source[source] || 0) + 1;

      // Group by severity
      const severity = error.severity || "unknown";
      errors_by_severity[severity] = (errors_by_severity[severity] || 0) + 1;
    }

    // STEP 4: Build response
    const summary: ErrorGroupsSummary = {
      total_errors,
      unresolved_errors,
      errors_by_source,
      errors_by_severity,
    };

    logger.info("ERROR_GROUPS", "Computed error groups summary");

    // STEP 5: Return response
    return NextResponse.json(summary);
  } catch (error: any) {
    logger.error("ERROR_GROUPS", "Failed to fetch error groups", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch error groups",
        details: error.message || error,
      },
      { status: 500 }
    );
  }
}
