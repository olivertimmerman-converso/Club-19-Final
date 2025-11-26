import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const revalidate = 0;

/**
 * GET /api/xero/contacts
 * Search Xero contacts by name
 * Query param: ?query=searchterm
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query || query.length < 2) {
      return NextResponse.json({ contacts: [] });
    }

    // Get Xero access token from environment
    const xeroAccessToken = process.env.XERO_ACCESS_TOKEN;
    const xeroTenantId = process.env.XERO_TENANT_ID;

    if (!xeroAccessToken || !xeroTenantId) {
      console.error("Missing XERO_ACCESS_TOKEN or XERO_TENANT_ID");
      return NextResponse.json(
        { error: "Xero configuration missing" },
        { status: 500 }
      );
    }

    // Build Xero API URL with where filter
    // URL encode the query to handle special characters
    const whereClause = `Name.Contains("${query.replace(/"/g, '\\"')}")`;
    const encodedWhere = encodeURIComponent(whereClause);
    const xeroUrl = `https://api.xero.com/api.xro/2.0/Contacts?where=${encodedWhere}`;

    // Call Xero API
    const response = await fetch(xeroUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${xeroAccessToken}`,
        "Xero-tenant-id": xeroTenantId,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Xero API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Xero API error", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Xero returns { Contacts: [...] }
    const contacts = (data.Contacts || []).map((contact: any) => ({
      Name: contact.Name,
      ContactID: contact.ContactID,
      EmailAddress: contact.EmailAddress || undefined,
    }));

    return NextResponse.json({ contacts });
  } catch (error: any) {
    console.error("Contact search error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
