/**
 * Club 19 Sales OS - Shared Role Utilities
 *
 * This module contains role types and utilities that can be used
 * in both client and server components, as well as in middleware.
 *
 * IMPORTANT: Do not import server-only APIs here.
 */

export type Role = "shopper" | "admin" | "finance" | "superadmin";

/**
 * Roles allowed to access legacy dashboards
 */
export const LEGACY_ALLOWED_ROLES = ["superadmin", "admin", "finance"] as const;

/**
 * Unified role resolution from Clerk metadata
 * Single source of truth for reading role from publicMetadata
 *
 * This function can be used in:
 * - Server Components
 * - Client Components
 * - Middleware (Edge Runtime)
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
