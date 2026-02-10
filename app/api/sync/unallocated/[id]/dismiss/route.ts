/**
 * Club 19 Sales OS - Dismiss Unallocated Invoice
 *
 * POST /api/sync/unallocated/[id]/dismiss
 * Soft-deletes an unallocated invoice by marking it as dismissed
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserRole } from "@/lib/getUserRole";
import * as logger from "@/lib/logger";

// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
// ORIGINAL XATA: const xata = getXataClient();

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role permissions
    const role = await getUserRole();
    if (!["superadmin", "operations", "founder", "admin"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    logger.info("DISMISS", "Dismissing unallocated invoice", { saleId: id, userId });

    // Check if the sale exists and is unallocated
    // ORIGINAL XATA: const sale = await xata.db.Sales.read(id);
    const saleResults = await db
      .select()
      .from(sales)
      .where(eq(sales.id, id))
      .limit(1);
    const sale = saleResults[0] || null;

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (!sale.needsAllocation) {
      return NextResponse.json(
        { error: "This invoice is not in the unallocated list" },
        { status: 400 }
      );
    }

    // Mark as dismissed
    // ORIGINAL XATA: await xata.db.Sales.update(id, {
    // ORIGINAL XATA:   dismissed: true,
    // ORIGINAL XATA:   dismissed_at: new Date(),
    // ORIGINAL XATA:   dismissed_by: userId,
    // ORIGINAL XATA: });
    await db
      .update(sales)
      .set({
        dismissed: true,
        dismissedAt: new Date(),
        dismissedBy: userId,
      })
      .where(eq(sales.id, id));

    logger.info("DISMISS", "Invoice dismissed successfully", {
      saleId: id,
      invoiceNumber: sale.xeroInvoiceNumber,
    });

    return NextResponse.json({
      success: true,
      message: "Invoice dismissed successfully",
    });
  } catch (error: any) {
    logger.error("DISMISS", "Error dismissing invoice", {
      saleId: id,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to dismiss invoice", details: error.message },
      { status: 500 }
    );
  }
}
