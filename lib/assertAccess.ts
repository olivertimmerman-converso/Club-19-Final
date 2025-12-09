/**
 * Club 19 Sales OS - Access Control & RBAC
 *
 * Production-ready authorization system
 * All logic delegated to lib/permissions.ts (single source of truth)
 */

import { redirect } from "next/navigation";
import {
  type StaffRole,
  canAccessRoute,
  isRouteReadOnly,
  canAccessLegacy as canAccessLegacyRoute,
} from "./permissions";

/**
 * Check if a role can access a specific route
 *
 * @param pathname - The route path to check
 * @param role - User's staff role
 * @returns true if access granted, false otherwise
 */
export function canAccessRoute_Deprecated(pathname: string, role: StaffRole): boolean {
  console.log(`[RBAC] 🔐 Checking access: pathname="${pathname}", role="${role}"`);

  const hasAccess = canAccessRoute(role, pathname);

  if (hasAccess) {
    console.log(`[RBAC] ✅ GRANTED: ${role} can access "${pathname}"`);
  } else {
    console.log(`[RBAC] ❌ DENIED: ${role} cannot access "${pathname}"`);
  }

  return hasAccess;
}

// Re-export the main function with the expected name for backward compatibility
export { canAccessRoute };

/**
 * Assert access to a route - throws redirect if denied
 *
 * Use this in page.tsx files for SSR access control
 *
 * @param pathname - The route path to check
 * @param role - User's staff role
 * @throws Redirect to /unauthorised if access denied
 */
export function assertAccess(pathname: string, role: StaffRole): void {
  console.log(`[assertAccess] 🔒 Asserting access for role="${role}" to pathname="${pathname}"`);

  if (!canAccessRoute(role, pathname)) {
    console.error(`[assertAccess] 🚫 ACCESS DENIED - Redirecting to /unauthorised`);
    redirect("/unauthorised");
  }

  console.log(`[assertAccess] ✅ Access granted`);
}

/**
 * Check if role can access legacy dashboards
 *
 * @param role - User's staff role
 * @returns true if can access legacy, false otherwise
 */
export function canAccessLegacy(role: StaffRole): boolean {
  return canAccessLegacyRoute(role);
}

/**
 * Assert legacy access - throws redirect if denied
 *
 * @param role - User's staff role
 * @throws Redirect to /unauthorised if access denied
 */
export function assertLegacyAccess(role: StaffRole): void {
  console.log(`[assertLegacyAccess] 🔐 Checking legacy access for role="${role}"`);

  if (!canAccessLegacy(role)) {
    console.error(`[assertLegacyAccess] ❌ DENIED - Role "${role}" cannot access legacy dashboards`);
    console.error(`[assertLegacyAccess] 🚫 Redirecting to /unauthorised`);
    redirect("/unauthorised");
  }

  console.log(`[assertLegacyAccess] ✅ Legacy access granted`);
}

/**
 * Check if a route is read-only for a given role
 *
 * @param pathname - The route path to check
 * @param role - User's staff role
 * @returns true if read-only, false otherwise
 */
export function isReadOnly(pathname: string, role: StaffRole): boolean {
  return isRouteReadOnly(role, pathname);
}
