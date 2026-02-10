/**
 * Club 19 Sales OS - Restore Dismissed Invoice
 *
 * POST /api/sync/unallocated/[id]/restore
 * Restores a previously dismissed unallocated invoice
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

    logger.info("RESTORE", "Restoring dismissed invoice", { saleId: id, userId });

    // Check if the sale exists
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

    if (!sale.dismissed) {
      return NextResponse.json(
        { error: "This invoice is not dismissed" },
        { status: 400 }
      );
    }

    // Restore by clearing dismissed fields
    // ORIGINAL XATA: await xata.db.Sales.update(id, {
    // ORIGINAL XATA:   dismissed: false,
    // ORIGINAL XATA:   dismissed_at: null,
    // ORIGINAL XATA:   dismissed_by: null,
    // ORIGINAL XATA: });
    await db
      .update(sales)
      .set({
        dismissed: false,
        dismissedAt: null,
        dismissedBy: null,
      })
      .where(eq(sales.id, id));

    logger.info("RESTORE", "Invoice restored successfully", {
      saleId: id,
      invoiceNumber: sale.xeroInvoiceNumber,
    });

    return NextResponse.json({
      success: true,
      message: "Invoice restored successfully",
    });
  } catch (error: any) {
    logger.error("RESTORE", "Error restoring invoice", {
      saleId: id,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to restore invoice", details: error.message },
      { status: 500 }
    );
  }
}
