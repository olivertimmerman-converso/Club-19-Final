/**
 * Club 19 Sales OS - Role Resolution
 *
 * Server-side helper to get user role from Clerk
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export type Role = "shopper" | "admin" | "finance" | "superadmin";

/**
 * Roles allowed to access legacy dashboards
 */
export const LEGACY_ALLOWED_ROLES = ["superadmin", "admin", "finance"] as const;

/**
 * Unified role resolution from Clerk metadata
 * Single source of truth for reading role from publicMetadata
 *
 * @param metadata - Clerk publicMetadata object
 * @returns Role - User's role (defaults to "shopper" if not set)
 */
export function resolveUserRoleFromMetadata(
  metadata: { staffRole?: Role; role?: Role } | null | undefined
): Role {
  const rawRole = metadata?.staffRole || metadata?.role;

  if (!rawRole) {
    return "shopper";
  }

  // Normalize role: trim whitespace, lowercase, then validate
  const normalized = rawRole.toString().trim().toLowerCase();

  // Map to valid Role type
  if (normalized === "superadmin") return "superadmin";
  if (normalized === "admin") return "admin";
  if (normalized === "finance") return "finance";
  if (normalized === "shopper") return "shopper";

  // Default to shopper if unrecognized
  console.warn(`[resolveUserRoleFromMetadata] Unknown role "${rawRole}" - defaulting to "shopper"`);
  return "shopper";
}

/**
 * Assert that a user role has access to legacy dashboards
 * Redirects to /unauthorised if access denied
 *
 * @param role - User's role to check
 */
export function assertLegacyAccess(role: Role): void {
  if (!LEGACY_ALLOWED_ROLES.includes(role as any)) {
    console.error(`[assertLegacyAccess] ❌ Role "${role}" denied access to legacy dashboards`);
    redirect("/unauthorised");
  }
}

/**
 * Get the current user's role from Clerk metadata
 * Server-side only
 *
 * @returns Role - User's role (defaults to "shopper" if not set)
 */
export async function getUserRole(): Promise<Role> {
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
