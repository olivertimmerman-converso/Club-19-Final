import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { hasXeroConnection } from "@/lib/xero-auth";
import * as logger from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/xero/status
 * Check if Xero integration is connected (uses integration user)
 * Lightweight check without calling Xero API
 *
 * Accessible by: all authenticated users (shoppers need this for the New Sale wizard)
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { connected: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use integration user to check Xero connection status
    const integrationUserId = process.env.XERO_INTEGRATION_CLERK_USER_ID;
    if (!integrationUserId) {
      logger.error("XERO_STATUS", "XERO_INTEGRATION_CLERK_USER_ID not configured");
      return NextResponse.json(
        { connected: false, error: "Xero integration not configured" },
        { status: 500 }
      );
    }

    const role = await getUserRole();
    logger.info("XERO_STATUS", "Checking connection via integration user", { userId, role });
    const connected = await hasXeroConnection(integrationUserId);
    logger.info("XERO_STATUS", "Connection status checked", { userId, connected });

    return NextResponse.json({ connected });
  } catch (error: any) {
    logger.error("XERO_STATUS", "Error checking status", { error });
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 500 }
    );
  }
}
