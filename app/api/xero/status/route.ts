import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasXeroConnection } from "@/lib/xero-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/xero/status
 * Check if current user has Xero connected
 * Lightweight check without calling Xero API
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

    console.log(`[XERO STATUS] Checking connection for user: ${userId}`);
    const connected = await hasXeroConnection(userId);
    console.log(`[XERO STATUS] User ${userId} connected: ${connected}`);

    return NextResponse.json({ connected });
  } catch (error: any) {
    console.error("[XERO STATUS] Error:", error);
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 500 }
    );
  }
}
