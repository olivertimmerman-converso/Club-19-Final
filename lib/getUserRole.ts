/**
 * Club 19 Sales OS - Server-Side Role Resolution
 *
 * Server-side helper to get user role from Clerk
 *
 * IMPORTANT: This module uses server-only APIs and should ONLY be imported
 * from Server Components, Server Actions, and API routes.
 *
 * For client components or middleware, import from lib/roleUtils.ts instead.
 */

import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  type Role,
  LEGACY_ALLOWED_ROLES,
  resolveUserRoleFromMetadata
} from "./roleUtils";

/**
 * Get the current user's role from Clerk metadata
 * Server-side only - uses clerkClient()
 *
 * @returns Role - User's role (defaults to "shopper" if not set)
 */
export async function getUserRole(): Promise<Role> {
  // ---------------------------------------------
  // TEST MODE OVERRIDE (RBAC + AUTH DISABLED)
  // Always return superadmin in test mode
  // ---------------------------------------------
  if (process.env.TEST_MODE === "true") {
    console.warn("[TEST MODE] getUserRole() bypassed - returning 'superadmin'");
    return "superadmin";
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return "shopper";
    }

    const user = await (await clerkClient()).users.getUser(userId);
    const metadata = user?.publicMetadata as { role?: Role; staffRole?: Role } | undefined;

    // Use unified resolver
    return resolveUserRoleFromMetadata(metadata);
  } catch (error) {
    console.error("[getUserRole] Error fetching user role:", error);
    return "shopper";
  }
}

/**
 * Assert that a user role has access to legacy dashboards
 * Redirects to /unauthorised if access denied
 *
 * Server-side only - uses Next.js redirect()
 *
 * @param role - User's role to check
 */
export function assertLegacyAccess(role: Role): void {
  // ---------------------------------------------
  // TEST MODE OVERRIDE (RBAC + AUTH DISABLED)
  // Never block access in test mode
  // ---------------------------------------------
  if (process.env.TEST_MODE === "true") {
    console.warn(`[TEST MODE] assertLegacyAccess() bypassed - allowing role: ${role}`);
    return;
  }

  if (!LEGACY_ALLOWED_ROLES.includes(role as any)) {
    console.error(`[assertLegacyAccess] ❌ Role "${role}" denied access to legacy dashboards`);
    redirect("/unauthorised");
  }
}
