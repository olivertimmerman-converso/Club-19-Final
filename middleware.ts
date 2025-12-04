/**
 * Club 19 Sales OS - Production Middleware
 *
 * Handles:
 * - Clerk authentication
 * - Role-based access control (RBAC)
 * - Route protection
 * - Graceful error handling
 *
 * NO TEST MODE - Full production authentication
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessRoute } from "./lib/assertAccess";
import { type StaffRole, isValidStaffRole, getDefaultRole } from "./lib/roleTypes";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/unauthorised",         // Access denied page (needs to be accessible)
  "/debug-role",           // Debug page (for troubleshooting auth issues)
  "/api/xero/webhooks",    // Xero webhooks (signature-verified internally)
  "/favicon(.*)",
  "/api/webhooks(.*)",
]);

// Access denied page
const ACCESS_DENIED = "/unauthorised";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  console.log(`[Middleware] 🛡️  Processing request: ${pathname}`);

  // ============================================
  // 1. ALLOW PUBLIC ROUTES
  // ============================================
  if (isPublicRoute(req)) {
    console.log(`[Middleware] 🌐 Public route - allowing`);
    return NextResponse.next();
  }

  // ============================================
  // 2. REQUIRE AUTHENTICATION
  // ============================================
  try {
    const { userId, sessionClaims } = await auth();
    console.log(`[Middleware] 👤 UserId: ${userId || "(none)"}`);

    if (!userId) {
      console.log(`[Middleware] 🔒 No session - redirecting to /sign-in`);
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // ============================================
    // 3. EXTRACT ROLE FROM SESSION CLAIMS
    // ============================================
    interface ClerkSessionClaims {
      publicMetadata?: {
        staffRole?: string;
      };
    }

    const metadata = (sessionClaims as ClerkSessionClaims)?.publicMetadata;
    console.log(`[Middleware] 📦 Metadata from session:`, JSON.stringify(metadata, null, 2));

    const rawRole = metadata?.staffRole;
    console.log(`[Middleware] 📋 Raw staffRole: "${rawRole}"`);

    // Validate role
    const role: StaffRole = rawRole && isValidStaffRole(rawRole) ? rawRole : getDefaultRole();
    console.log(`[Middleware] ✅ Resolved role: "${role}"`);

    // ============================================
    // 4. CHECK RBAC PERMISSIONS
    // ============================================
    const hasAccess = canAccessRoute(pathname, role);
    console.log(`[Middleware] 🔐 RBAC check: hasAccess=${hasAccess}`);

    if (!hasAccess) {
      console.error(`[Middleware] ❌ ACCESS DENIED for role "${role}" to "${pathname}"`);
      console.error(`[Middleware] 🚨 Redirecting to ${ACCESS_DENIED}`);
      return NextResponse.redirect(new URL(ACCESS_DENIED, req.url));
    }

    console.log(`[Middleware] ✅ Access GRANTED - continuing to route`);
    return NextResponse.next();

  } catch (error) {
    // NEVER crash middleware - log and redirect
    console.error(`[Middleware] ❌ Fatal error:`, error);
    console.error(`[Middleware] 📊 Error details:`, {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });

    // Redirect to sign-in on any auth error
    console.log(`[Middleware] 🔄 Redirecting to /sign-in due to error`);
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
