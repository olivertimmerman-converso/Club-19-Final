/**
 * Club 19 Sales OS - Supplier Search API
 *
 * GET endpoint for searching suppliers by name
 * Used by Deal Studio for supplier autocomplete
 */

import { NextRequest, NextResponse } from "next/server";
import { getXataClient } from "@/src/xata";

const xata = getXataClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    // If no query, return empty results
    if (!query.trim()) {
      return NextResponse.json([]);
    }

    // Search Suppliers by name (case-insensitive, partial match)
    // Use Xata's full-text search or filter with contains
    const suppliers = await xata.db.Suppliers.filter({
      name: { $contains: query },
    })
      .select(["id", "name", "email"])
      .sort("name", "asc")
      .getMany({ pagination: { size: 20 } });

    // Format response for autocomplete
    const results = suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name || "",
      email: supplier.email || "",
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to search suppliers" },
      { status: 500 }
    );
  }
}
