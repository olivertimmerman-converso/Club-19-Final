/**
 * Club 19 Sales OS - Middleware
 *
 * Handles:
 * - Clerk authentication
 * - Role-based access control (RBAC)
 * - Route protection
 * - Homepage redirects based on role
 * - Legacy invoice/trade routes
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccess, getHomepage, type UserRole } from "./lib/rbac";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/xero/webhooks",  // Xero webhooks (signature-verified internally)
]);

// Legacy protected routes (existing invoice/trade system)
const isLegacyProtectedRoute = createRouteMatcher([
  "/trade(.*)",
  "/invoice(.*)",
]);

// Access denied page
const ACCESS_DENIED = "/access-denied";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect legacy routes
  if (isLegacyProtectedRoute(req)) {
    await auth().protect();
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Get user role from Clerk metadata
  interface ClerkMetadata {
    metadata?: {
      role?: UserRole;
    };
  }
  const role = ((sessionClaims as ClerkMetadata)?.metadata?.role) || "shopper";

  // Protect admin-only API routes
  const isAdminAPIRoute =
    pathname.startsWith("/api/errors") ||
    pathname.startsWith("/api/xero/sync-payments");

  if (isAdminAPIRoute && role !== "admin" && role !== "superadmin" && role !== "finance") {
    console.error(`[MIDDLEWARE] ❌ Blocked ${role} from accessing ${pathname}`);
    return NextResponse.json(
      { error: "Forbidden", message: "Admin access required" },
      { status: 403 }
    );
  }

  // Redirect root to role homepage
  if (pathname === "/") {
    const homepage = getHomepage(role);
    return NextResponse.redirect(new URL(homepage, req.url));
  }

  // Allow access to access-denied page
  if (pathname === ACCESS_DENIED) {
    return NextResponse.next();
  }

  // Check RBAC permissions for Staff routes
  const isStaffRoute = pathname.startsWith("/staff");

  if (isStaffRoute && !canAccess(pathname, role)) {
    return NextResponse.redirect(new URL(ACCESS_DENIED, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
