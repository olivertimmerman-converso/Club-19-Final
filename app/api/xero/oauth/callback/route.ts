import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Xero OAuth Token Response
 */
interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
}

/**
 * Xero Connection (Tenant)
 */
interface XeroConnection {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
}

/**
 * GET /api/xero/oauth/callback
 * Handles OAuth 2.0 callback from Xero
 * Exchanges authorization code for tokens and stores in Clerk privateMetadata
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[XERO CALLBACK] === OAuth callback initiated ===");

  try {
    // 1. Verify user is authenticated via Clerk
    const { userId } = await auth();

    if (!userId) {
      console.error("[XERO CALLBACK] ❌ No userId - user not authenticated");
      return NextResponse.redirect(
        new URL("/sign-in?error=xero_auth_failed", request.url)
      );
    }

    console.log(`[XERO CALLBACK] ✓ User authenticated: ${userId}`);

    // 2. Extract authorization code and state from query params
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors from Xero
    if (error) {
      console.error(`[XERO CALLBACK] ❌ Xero returned error: ${error} - ${errorDescription}`);
      return NextResponse.redirect(
        new URL(`/trade/new?xero_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      console.error("[XERO CALLBACK] ❌ Missing authorization code");
      return NextResponse.redirect(
        new URL("/trade/new?xero_error=missing_code", request.url)
      );
    }

    // Verify state matches userId for security
    if (state !== userId) {
      console.error(`[XERO CALLBACK] ❌ State mismatch: expected ${userId}, got ${state}`);
      return NextResponse.redirect(
        new URL("/trade/new?xero_error=invalid_state", request.url)
      );
    }

    console.log(`[XERO CALLBACK] ✓ Authorization code received (length: ${code.length})`);

    // 3. Validate environment configuration
    const clientId = process.env.NEXT_PUBLIC_XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret || !appUrl) {
      console.error("[XERO CALLBACK] ❌ Missing environment variables:", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasAppUrl: !!appUrl,
      });
      return NextResponse.redirect(
        new URL("/trade/new?xero_error=config_missing", request.url)
      );
    }

    const redirectUri = `${appUrl}/api/xero/oauth/callback`;
    console.log(`[XERO CALLBACK] Redirect URI: ${redirectUri}`);

    // 4. Exchange authorization code for access token
    console.log("[XERO CALLBACK] Exchanging code for tokens...");
    const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[XERO CALLBACK] ❌ Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
      });
      return NextResponse.redirect(
        new URL("/trade/new?xero_error=token_exchange_failed", request.url)
      );
    }

    const tokens: XeroTokenResponse = await tokenResponse.json();
    console.log(`[XERO CALLBACK] ✓ Tokens received (expires in ${tokens.expires_in}s)`);

    // 5. Fetch tenant/organization information
    console.log("[XERO CALLBACK] Fetching Xero tenant connections...");
    const connectionsResponse = await fetch("https://api.xero.com/connections", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!connectionsResponse.ok) {
      const errorText = await connectionsResponse.text();
      console.error("[XERO CALLBACK] ❌ Connections fetch failed:", {
        status: connectionsResponse.status,
        error: errorText,
      });
      return NextResponse.redirect(
        new URL("/trade/new?xero_error=connections_failed", request.url)
      );
    }

    const connections: XeroConnection[] = await connectionsResponse.json();

    if (!connections || connections.length === 0) {
      console.error("[XERO CALLBACK] ❌ No Xero organizations found for user");
      return NextResponse.redirect(
        new URL("/trade/new?xero_error=no_organizations", request.url)
      );
    }

    const primaryConnection = connections[0];
    console.log(`[XERO CALLBACK] ✓ Tenant found: ${primaryConnection.tenantName} (${primaryConnection.tenantId})`);

    // 6. Calculate token expiration timestamp
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // 7. Store tokens in Clerk user privateMetadata with nested structure
    console.log("[XERO CALLBACK] Storing tokens in Clerk privateMetadata...");
    await clerkClient.users.updateUser(userId, {
      privateMetadata: {
        xero: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: expiresAt,
          tenantId: primaryConnection.tenantId,
          tenantName: primaryConnection.tenantName,
          connectedAt: Date.now(),
        },
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[XERO CALLBACK] ✓✓✓ SUCCESS! Xero connected in ${duration}ms`);
    console.log(`[XERO CALLBACK] Stored metadata:`, {
      tenantId: primaryConnection.tenantId,
      tenantName: primaryConnection.tenantName,
      expiresIn: `${tokens.expires_in}s`,
    });

    // 8. Redirect back to trade wizard with success message
    return NextResponse.redirect(
      new URL("/trade/new?xero_connected=true", request.url)
    );
  } catch (error: any) {
    console.error("[XERO CALLBACK] ❌ Fatal error:", error);
    console.error("[XERO CALLBACK] Error stack:", error.stack);
    return NextResponse.redirect(
      new URL("/trade/new?xero_error=oauth_failed", request.url)
    );
  }
}
