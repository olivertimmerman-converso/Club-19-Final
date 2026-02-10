/**
 * Club 19 Sales OS - Create Shopper API
 *
 * POST endpoint to create a new Shopper record
 * Superadmin only
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { shoppers } from "@/db/schema";
import { eq } from "drizzle-orm";
// ORIGINAL XATA: import { getXataClient } from "@/src/xata";
import { getUserRole } from "@/lib/getUserRole";
import * as logger from "@/lib/logger";

// ORIGINAL XATA: const xata = getXataClient();

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const userRole = await getUserRole();

    if (userRole !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden - Superadmin only" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    // ORIGINAL XATA: const { name, email, commission_scheme = "standard" } = body;
    const { name, email, commission_scheme: commissionScheme = "standard" } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Normalize the name (trim whitespace)
    const normalizedName = name.trim();

    // Check for duplicate email
    // ORIGINAL XATA: const existingByEmail = await xata.db.Shoppers.filter({ email }).getFirst();
    const existingByEmailResults = await db
      .select()
      .from(shoppers)
      .where(eq(shoppers.email, email))
      .limit(1);
    const existingByEmail = existingByEmailResults[0] || null;

    if (existingByEmail) {
      return NextResponse.json(
        { error: "A shopper with this email already exists" },
        { status: 409 }
      );
    }

    // Check for existing shopper with same/similar name (case-insensitive)
    // ORIGINAL XATA: const allShoppers = await xata.db.Shoppers.select(["id", "name"]).getAll();
    const allShoppers = await db
      .select({
        id: shoppers.id,
        name: shoppers.name,
      })
      .from(shoppers);

    // Exact match check (case-insensitive)
    const exactMatch = allShoppers.find(
      (s) => s.name?.toLowerCase().trim() === normalizedName.toLowerCase()
    );

    if (exactMatch) {
      return NextResponse.json(
        {
          error: `A shopper named "${exactMatch.name}" already exists. Did you mean to use the existing record?`,
          existingShopper: { id: exactMatch.id, name: exactMatch.name },
        },
        { status: 409 }
      );
    }

    // Similar name check (one name contains the other, or partial match)
    const similarMatch = allShoppers.find((s) => {
      if (!s.name) return false;
      const existingLower = s.name.toLowerCase().trim();
      const newLower = normalizedName.toLowerCase();
      // Check if one contains the other (e.g., "Mary Clair" vs "Mary Clair Bromfield")
      return (
        existingLower.includes(newLower) ||
        newLower.includes(existingLower)
      );
    });

    if (similarMatch) {
      return NextResponse.json(
        {
          error: `A shopper with a similar name "${similarMatch.name}" already exists. Are you sure you want to create a separate record?`,
          existingShopper: { id: similarMatch.id, name: similarMatch.name },
          warning: true,
        },
        { status: 409 }
      );
    }

    // Create the shopper with normalized name
    // ORIGINAL XATA:
    // const shopper = await xata.db.Shoppers.create({
    //   name: normalizedName,
    //   email,
    //   commission_scheme,
    //   active: true,
    // });
    const newShopperResults = await db
      .insert(shoppers)
      .values({
        name: normalizedName,
        email,
        commissionScheme,
        active: true,
      })
      .returning();
    const shopper = newShopperResults[0];

    return NextResponse.json(
      {
        success: true,
        shopper: {
          id: shopper.id,
          name: shopper.name,
          email: shopper.email,
          // ORIGINAL XATA: commission_scheme: shopper.commission_scheme,
          commission_scheme: shopper.commissionScheme,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("SHOPPERS", "Error creating shopper", { error: error as any });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
