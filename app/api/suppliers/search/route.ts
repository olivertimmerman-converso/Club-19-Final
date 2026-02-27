/**
 * Club 19 Sales OS - Supplier Search API
 *
 * GET endpoint for searching suppliers by name
 * Used by Deal Studio for supplier autocomplete
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as logger from "@/lib/logger";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { ilike, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const supplierResults = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
      })
      .from(suppliers)
      .where(ilike(suppliers.name, `%${query}%`))
      .orderBy(sql`lower(${suppliers.name})`)
      .limit(20);

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
