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
import { canAccessRoute } from "./lib/sidebarConfig";
import { resolveUserRoleFromMetadata, type Role } from "./lib/roleUtils";

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
const ACCESS_DENIED = "/unauthorised";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // ---------------------------------------------
  // TEST MODE OVERRIDE (RBAC + AUTH DISABLED)
  // Bypass ALL authentication and RBAC checks
  // ---------------------------------------------
  if (process.env.TEST_MODE === "true") {
    console.warn(`[TEST MODE] ⚠️  Middleware override active for ${pathname}`);
    console.warn(`[TEST MODE] 🔓 Bypassing all auth + role checks`);
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();

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

  // Get user role from Clerk publicMetadata (Edge Runtime compatible)
  interface ClerkSessionClaims {
    publicMetadata?: {
      role?: Role;
      staffRole?: Role;
    };
  }
  const metadata = (sessionClaims as ClerkSessionClaims)?.publicMetadata;

  // Use unified role resolver (single source of truth)
  const role = resolveUserRoleFromMetadata(metadata);

  // Debug logging for role extraction
  if (pathname.startsWith("/staff") || pathname.startsWith("/dashboard") || pathname.startsWith("/sales") || pathname.startsWith("/clients") || pathname.startsWith("/suppliers") || pathname.startsWith("/invoices") || pathname.startsWith("/finance") || pathname.startsWith("/admin") || pathname.startsWith("/legacy")) {
    console.log(`[MIDDLEWARE] 🔍 User ${userId} accessing ${pathname}`);
    console.log(`[MIDDLEWARE] 📋 Resolved role: "${role}"`);
    console.log(`[MIDDLEWARE] 📦 Metadata:`, JSON.stringify(metadata, null, 2));
  }

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

  // Redirect root to /dashboard (universal entrypoint)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Allow access to unauthorised page (use constant for consistency)
  if (pathname === ACCESS_DENIED) {
    return NextResponse.next();
  }

  // Check RBAC permissions for new OS routes
  const isOSRoute = pathname.startsWith("/dashboard") ||
                    pathname.startsWith("/sales") ||
                    pathname.startsWith("/clients") ||
                    pathname.startsWith("/suppliers") ||
                    pathname.startsWith("/invoices") ||
                    pathname.startsWith("/finance") ||
                    pathname.startsWith("/admin") ||
                    pathname.startsWith("/legacy");

  // ---------------------------------------------
  // TEMPORARY OVERRIDE: RBAC DISABLED FOR TESTING
  // Allows all authenticated users to access OS routes,
  // including /legacy, /admin, /finance, etc.
  // This is a reversible patch to allow system preview
  // while Clerk metadata is being configured.
  // ---------------------------------------------
  if (isOSRoute) {
    console.warn(`[RBAC TEMP DISABLED] ⚠️  Allowing user through: pathname="${pathname}", resolvedRole="${role}", userId="${userId}"`);
    console.warn(`[RBAC TEMP DISABLED] 📦 Metadata:`, JSON.stringify(metadata, null, 2));
  }

  // ORIGINAL RBAC CODE (COMMENTED OUT FOR TESTING):
  // if (isOSRoute) {
  //   const hasAccess = canAccessRoute(pathname, role);
  //   console.log(`[MIDDLEWARE] 🔐 Route check for ${pathname}: role="${role}", hasAccess=${hasAccess}`);
  //
  //   if (!hasAccess) {
  //     console.error(`[MIDDLEWARE] ❌ Access denied: ${role} tried to access ${pathname}`);
  //     console.error(`[MIDDLEWARE] 🚨 BLOCKING USER - Redirecting to ${ACCESS_DENIED}`);
  //     return NextResponse.redirect(new URL(ACCESS_DENIED, req.url));
  //   }
  // }

  // Check RBAC permissions for legacy Staff routes (maintain backward compatibility)
  const isStaffRoute = pathname.startsWith("/staff");

  if (isStaffRoute && !canAccess(pathname, role as UserRole)) {
    console.error(`[MIDDLEWARE] ❌ Access denied: ${role} tried to access ${pathname}`);
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
