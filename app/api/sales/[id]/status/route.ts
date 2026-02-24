/**
 * Club 19 Sales OS - Sale Status Transition API
 *
 * PATCH /api/sales/{id}/status
 * Body: { status: "ongoing" | "completed" }
 *
 * "ongoing"   → parks the sale, excludes from monthly commission
 * "completed" → sets completedAt, sale counts in current month's commission
 *
 * Completion validates all required fields are present before allowing
 * the transition, preventing garbage commission numbers.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/getUserRole";
import { db } from "@/db";
import { sales, shoppers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole();
    const { id } = await params;
    const body = await request.json();
    const targetStatus = body.status as string;

    if (!targetStatus || !["ongoing", "completed"].includes(targetStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'ongoing' or 'completed'" },
        { status: 400 }
      );
    }

    // Fetch the sale
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, id))
      .limit(1);

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Role check: shoppers can only change their own sales
    if (role === "shopper") {
      const shopperRecord = await db.query.shoppers.findFirst({
        where: eq(shoppers.clerkUserId, userId),
      });
      if (!shopperRecord || sale.shopperId !== shopperRecord.id) {
        return NextResponse.json(
          { error: "You can only change status of your own sales" },
          { status: 403 }
        );
      }
    }

    if (targetStatus === "ongoing") {
      // Mark as ongoing — parks the sale
      // Allow from invoiced or any non-terminal status
      if (sale.status === "ongoing") {
        return NextResponse.json(
          { error: "Sale is already marked as ongoing" },
          { status: 400 }
        );
      }
      if (
        sale.status === "locked" ||
        sale.status === "commission_paid"
      ) {
        return NextResponse.json(
          { error: "Cannot mark a locked or commission-paid sale as ongoing" },
          { status: 400 }
        );
      }

      await db
        .update(sales)
        .set({ status: "ongoing" })
        .where(eq(sales.id, id));

      return NextResponse.json({ success: true, status: "ongoing" });
    }

    if (targetStatus === "completed") {
      // Validate required fields before allowing completion
      const missingFields: string[] = [];

      if (!sale.supplierId) missingFields.push("supplier");
      if (!sale.brand || sale.brand.trim() === "") missingFields.push("brand");
      if (!sale.buyPrice || sale.buyPrice <= 0) missingFields.push("buyPrice");
      if (!sale.category || sale.category.trim() === "")
        missingFields.push("category");

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot complete sale — missing required fields",
            missingFields,
          },
          { status: 400 }
        );
      }

      // Set status to paid and record completion
      await db
        .update(sales)
        .set({
          status: "paid",
          completedAt: new Date(),
          completedBy: userId,
        })
        .where(eq(sales.id, id));

      return NextResponse.json({ success: true, status: "paid" });
    }

    return NextResponse.json({ error: "Unhandled status" }, { status: 400 });
  } catch (error) {
    console.error("Status transition error:", error);
    return NextResponse.json(
      { error: "Failed to update sale status" },
      { status: 500 }
    );
  }
}
