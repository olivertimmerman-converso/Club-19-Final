/**
 * Club 19 Sales OS - Check Duplicate Shoppers API
 *
 * GET: List all shoppers and identify potential duplicates
 * POST: Merge duplicate shoppers (requires confirmation)
 *
 * Superadmin only
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { shoppers, sales, buyers } from "@/db/schema";
import { eq } from "drizzle-orm";
// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
import { getUserRole } from "@/lib/getUserRole";
import * as logger from "@/lib/logger";

// ORIGINAL XATA: const xata = getXataClient();

interface ShopperWithSales {
  id: string;
  name: string;
  email: string | null;
  salesCount: number;
}

interface DuplicateGroup {
  names: string[];
  shoppers: ShopperWithSales[];
  recommendation: string;
}

// GET: Check for duplicate shoppers
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole();
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden - Superadmin only" }, { status: 403 });
    }

    // ORIGINAL XATA: const shoppers = await xata.db.Shoppers.select(["id", "name", "email", "active"]).getAll();
    const allShoppers = await db
      .select({
        id: shoppers.id,
        name: shoppers.name,
        email: shoppers.email,
        active: shoppers.active,
      })
      .from(shoppers);

    // ORIGINAL XATA: const sales = await xata.db.Sales.select(["id", "shopper.id"]).getAll();
    const allSales = await db
      .select({
        id: sales.id,
        shopperId: sales.shopperId,
      })
      .from(sales);

    // Count sales per shopper
    const salesCountMap = new Map<string, number>();
    allSales.forEach((sale) => {
      // ORIGINAL XATA: if (sale.shopper?.id) {
      //   salesCountMap.set(sale.shopper.id, (salesCountMap.get(sale.shopper.id) || 0) + 1);
      // }
      if (sale.shopperId) {
        salesCountMap.set(sale.shopperId, (salesCountMap.get(sale.shopperId) || 0) + 1);
      }
    });

    // Build shopper list with sales count
    const shoppersWithSales: ShopperWithSales[] = allShoppers.map((s) => ({
      id: s.id,
      name: s.name || "Unknown",
      email: s.email || null,
      salesCount: salesCountMap.get(s.id) || 0,
    }));

    // Find exact duplicates (same name, case-insensitive)
    const nameGroups = new Map<string, ShopperWithSales[]>();
    shoppersWithSales.forEach((s) => {
      const normalizedName = s.name.toLowerCase().trim();
      if (!nameGroups.has(normalizedName)) {
        nameGroups.set(normalizedName, []);
      }
      nameGroups.get(normalizedName)!.push(s);
    });

    const exactDuplicates: DuplicateGroup[] = [];
    nameGroups.forEach((group, name) => {
      if (group.length > 1) {
        exactDuplicates.push({
          names: group.map((s) => s.name),
          shoppers: group,
          recommendation: `Merge into "${group.sort((a, b) => b.salesCount - a.salesCount)[0].name}" (most sales)`,
        });
      }
    });

    // Find similar names (one contains the other)
    const similarGroups: DuplicateGroup[] = [];
    const checked = new Set<string>();

    shoppersWithSales.forEach((s1) => {
      if (checked.has(s1.id)) return;

      const similar = shoppersWithSales.filter((s2) => {
        if (s1.id === s2.id || checked.has(s2.id)) return false;
        const name1 = s1.name.toLowerCase().trim();
        const name2 = s2.name.toLowerCase().trim();
        // Check if one contains the other but they're not exactly the same
        return (name1.includes(name2) || name2.includes(name1)) && name1 !== name2;
      });

      if (similar.length > 0) {
        const group = [s1, ...similar];
        group.forEach((s) => checked.add(s.id));
        similarGroups.push({
          names: group.map((s) => s.name),
          shoppers: group,
          recommendation: `Review: "${group.sort((a, b) => b.salesCount - a.salesCount)[0].name}" has most sales`,
        });
      }
    });

    return NextResponse.json({
      totalShoppers: allShoppers.length,
      shoppers: shoppersWithSales.sort((a, b) => b.salesCount - a.salesCount),
      exactDuplicates,
      similarNames: similarGroups,
      hasDuplicates: exactDuplicates.length > 0 || similarGroups.length > 0,
    });
  } catch (error) {
    logger.error("SHOPPERS", "Error checking duplicates", { error: error as any });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Merge duplicate shoppers
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole();
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden - Superadmin only" }, { status: 403 });
    }

    const body = await request.json();
    const { canonicalId, duplicateId, confirm } = body;

    if (!canonicalId || !duplicateId) {
      return NextResponse.json(
        { error: "canonicalId and duplicateId are required" },
        { status: 400 }
      );
    }

    // ORIGINAL XATA: const canonical = await xata.db.Shoppers.filter({ id: canonicalId }).getFirst();
    const canonicalResults = await db
      .select()
      .from(shoppers)
      .where(eq(shoppers.id, canonicalId))
      .limit(1);
    const canonical = canonicalResults[0] || null;

    // ORIGINAL XATA: const duplicate = await xata.db.Shoppers.filter({ id: duplicateId }).getFirst();
    const duplicateResults = await db
      .select()
      .from(shoppers)
      .where(eq(shoppers.id, duplicateId))
      .limit(1);
    const duplicate = duplicateResults[0] || null;

    if (!canonical) {
      return NextResponse.json({ error: "Canonical shopper not found" }, { status: 404 });
    }
    if (!duplicate) {
      return NextResponse.json({ error: "Duplicate shopper not found" }, { status: 404 });
    }

    // ORIGINAL XATA:
    // const salesWithDuplicate = await xata.db.Sales
    //   .filter({ "shopper.id": duplicateId })
    //   .select(["id", "sale_reference", "item_title"])
    //   .getAll();
    const salesWithDuplicate = await db
      .select({
        id: sales.id,
        saleReference: sales.saleReference,
        itemTitle: sales.itemTitle,
      })
      .from(sales)
      .where(eq(sales.shopperId, duplicateId));

    // ORIGINAL XATA:
    // const buyersWithDuplicate = await xata.db.Buyers
    //   .filter({ "owner.id": duplicateId })
    //   .select(["id", "name"])
    //   .getAll();
    const buyersWithDuplicate = await db
      .select({
        id: buyers.id,
        name: buyers.name,
      })
      .from(buyers)
      .where(eq(buyers.ownerId, duplicateId));

    // If not confirmed, return preview
    if (!confirm) {
      return NextResponse.json({
        preview: true,
        canonical: { id: canonical.id, name: canonical.name },
        duplicate: { id: duplicate.id, name: duplicate.name },
        salesCount: salesWithDuplicate.length,
        buyersCount: buyersWithDuplicate.length,
        message: `Will merge "${duplicate.name}" into "${canonical.name}". ${salesWithDuplicate.length} sales and ${buyersWithDuplicate.length} buyers will be updated.`,
      });
    }

    // Execute the merge
    logger.info("SHOPPERS", "Executing shopper merge", {
      canonicalId,
      canonicalName: canonical.name,
      duplicateId,
      duplicateName: duplicate.name,
    });

    // Update Sales
    // ORIGINAL XATA:
    // for (const sale of salesWithDuplicate) {
    //   await xata.db.Sales.update(sale.id, { shopper: canonicalId });
    // }
    for (const sale of salesWithDuplicate) {
      await db
        .update(sales)
        .set({ shopperId: canonicalId })
        .where(eq(sales.id, sale.id));
    }

    // Update Buyers
    // ORIGINAL XATA:
    // for (const buyer of buyersWithDuplicate) {
    //   await xata.db.Buyers.update(buyer.id, { owner: canonicalId } as any);
    // }
    for (const buyer of buyersWithDuplicate) {
      await db
        .update(buyers)
        .set({ ownerId: canonicalId })
        .where(eq(buyers.id, buyer.id));
    }

    // Delete the duplicate
    // ORIGINAL XATA: await xata.db.Shoppers.delete(duplicateId);
    await db.delete(shoppers).where(eq(shoppers.id, duplicateId));

    logger.info("SHOPPERS", "Shopper merge completed", {
      canonicalId,
      canonicalName: canonical.name,
      deletedId: duplicateId,
      deletedName: duplicate.name,
      salesUpdated: salesWithDuplicate.length,
      buyersUpdated: buyersWithDuplicate.length,
    });

    return NextResponse.json({
      success: true,
      merged: {
        canonical: { id: canonical.id, name: canonical.name },
        deleted: { id: duplicate.id, name: duplicate.name },
        salesUpdated: salesWithDuplicate.length,
        buyersUpdated: buyersWithDuplicate.length,
      },
    });
  } catch (error) {
    logger.error("SHOPPERS", "Error merging shoppers", { error: error as any });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
