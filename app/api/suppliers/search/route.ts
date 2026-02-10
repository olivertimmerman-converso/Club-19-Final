/**
 * Club 19 Sales OS - Supplier Search API
 *
 * GET endpoint for searching suppliers by name
 * Used by Deal Studio for supplier autocomplete
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as logger from "@/lib/logger";

// Drizzle imports
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { ilike, asc } from "drizzle-orm";

// ORIGINAL XATA:
// import { getXataClient } from "@/src/xata";
// const xata = getXataClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication - any authenticated user can search suppliers
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    logger.info('SUPPLIER_SEARCH', 'Search query received', { query });

    // If no query, return empty results
    if (!query.trim()) {
      logger.info('SUPPLIER_SEARCH', 'Empty query, returning empty array');
      return NextResponse.json([]);
    }

    // ORIGINAL XATA:
    // const suppliers = await xata.db.Suppliers.filter({
    //   name: { $iContains: query },
    // })
    //   .select(["id", "name", "email"])
    //   .sort("name", "asc")
    //   .getMany();

    // DRIZZLE:
    // Search Suppliers by name (case-insensitive, partial match)
    const supplierResults = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
      })
      .from(suppliers)
      .where(ilike(suppliers.name, `%${query}%`))
      .orderBy(asc(suppliers.name))
      .limit(20);

    logger.info('SUPPLIER_SEARCH', 'Search completed', {
      returnedResults: supplierResults.length,
      firstThree: supplierResults.slice(0, 3).map(s => s.name)
    });

    // Format response for autocomplete
    const results = supplierResults.map((supplier) => ({
      id: supplier.id,
      name: supplier.name || "",
      email: supplier.email || "",
    }));

    return NextResponse.json(results);
  } catch (error) {
    logger.error("SUPPLIER_SEARCH", "Error searching suppliers", { error: error as any });
    return NextResponse.json(
      { error: "Failed to search suppliers" },
      { status: 500 }
    );
  }
}
