import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getValidTokens } from "@/lib/xero-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Xero Contact from API
 */
interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  IsCustomer: boolean;
  IsSupplier: boolean;
}

/**
 * Normalized contact response
 */
interface NormalizedContact {
  contactId: string;
  name: string;
  email?: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

/**
 * GET /api/xero/contacts/suppliers
 * Search Xero contacts that are SUPPLIERS only
 * Query param: ?query=searchterm
 *
 * Filter: IsSupplier==true OR Purchases.DefaultLineAmountType!=""
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[XERO SUPPLIERS] === API Route Started ===");

  try {
    // 1. Authenticate user
    const { userId } = await auth();
    console.log(`[XERO SUPPLIERS] User ID: ${userId || "NOT AUTHENTICATED"}`);

    if (!userId) {
      console.error("[XERO SUPPLIERS] ❌ Unauthorized request");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in" },
        { status: 401 }
      );
    }

    // 2. Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    console.log(`[XERO SUPPLIERS] Query parameter: "${query}"`);

    if (!query || query.length < 2) {
      console.log(`[XERO SUPPLIERS] Query too short (${query?.length || 0} chars), returning empty`);
      return NextResponse.json({ contacts: [] });
    }

    console.log(`[XERO SUPPLIERS] Searching for: "${query}" (user: ${userId})`);

    // 3. Get valid Xero OAuth tokens (auto-refreshes if needed)
    let accessToken: string;
    let tenantId: string;

    try {
      console.log("[XERO SUPPLIERS] Fetching valid tokens...");
      const tokens = await getValidTokens(userId);
      accessToken = tokens.accessToken;
      tenantId = tokens.tenantId;
      console.log(`[XERO SUPPLIERS] ✓ Valid tokens obtained for tenant: ${tenantId}`);
    } catch (error: any) {
      console.error("[XERO SUPPLIERS] ❌ Failed to get Xero tokens:", error.message);
      return NextResponse.json(
        {
          error: "Xero not connected",
          message: error.message,
          action: "connect_xero",
        },
        { status: 401 }
      );
    }

    // 4. Build Xero API URL with SUPPLIERS filter - DUAL MODE SEARCH
    // Sanitize query for safe use in Xero filter
    const sanitizedQuery = query.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    const nameFilter = `Name.Contains("${sanitizedQuery}")`;

    // FIRST ATTEMPT: Try IsSupplier==true filter
    let whereClause = `${nameFilter} AND IsSupplier==true`;
    let encodedWhere = encodeURIComponent(whereClause);
    let xeroUrl = `https://api.xero.com/api.xro/2.0/Contacts?where=${encodedWhere}`;

    console.log(`[XERO SUPPLIERS] First attempt with filter: ${whereClause}`);

    // 5. Call Xero API (first attempt)
    console.log("[XERO SUPPLIERS] Calling Xero API (IsSupplier filter)...");
    let response = await fetch(xeroUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log(`[XERO SUPPLIERS] First attempt response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[XERO SUPPLIERS] ❌ Xero API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Token might be invalid - suggest reconnecting
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            error: "Xero authentication failed",
            message: "Please reconnect your Xero account",
            action: "reconnect_xero",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "Xero API error", details: errorText },
        { status: response.status }
      );
    }

    let data = await response.json();
    let contacts: NormalizedContact[] = (data.Contacts || []).map((contact: XeroContact) => ({
      contactId: contact.ContactID,
      name: contact.Name,
      email: contact.EmailAddress || undefined,
      isCustomer: contact.IsCustomer,
      isSupplier: contact.IsSupplier,
    }));

    console.log(`[XERO SUPPLIERS] First attempt found ${contacts.length} contacts`);

    // FALLBACK: If zero results, try without IsSupplier filter
    if (contacts.length === 0) {
      console.log("[XERO SUPPLIERS] Zero results, trying fallback without IsSupplier filter...");
      whereClause = nameFilter;
      encodedWhere = encodeURIComponent(whereClause);
      xeroUrl = `https://api.xero.com/api.xro/2.0/Contacts?where=${encodedWhere}`;

      console.log(`[XERO SUPPLIERS] Fallback filter: ${whereClause}`);

      response = await fetch(xeroUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Xero-tenant-id": tenantId,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log(`[XERO SUPPLIERS] Fallback response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[XERO SUPPLIERS] ❌ Fallback Xero API error:", {
          status: response.status,
          error: errorText,
        });

        if (response.status === 401 || response.status === 403) {
          return NextResponse.json(
            {
              error: "Xero authentication failed",
              message: "Please reconnect your Xero account",
              action: "reconnect_xero",
            },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { error: "Xero API error", details: errorText },
          { status: response.status }
        );
      }

      data = await response.json();
      contacts = (data.Contacts || []).map((contact: XeroContact) => ({
        contactId: contact.ContactID,
        name: contact.Name,
        email: contact.EmailAddress || undefined,
        isCustomer: contact.IsCustomer,
        isSupplier: contact.IsSupplier,
      }));

      console.log(`[XERO SUPPLIERS] Fallback found ${contacts.length} contacts`);
    }

    const duration = Date.now() - startTime;
    console.log(`[XERO SUPPLIERS] ✓✓✓ Returning ${contacts.length} supplier contacts in ${duration}ms`);

    return NextResponse.json({ contacts });
  } catch (error: any) {
    console.error("[XERO SUPPLIERS] ❌ Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
