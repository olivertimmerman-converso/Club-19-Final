/**
 * Club 19 Sales OS - Server-Side Role Resolution
 *
 * Production-ready role resolution for SSR
 * NEVER crashes - always returns a valid StaffRole
 */

import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { type StaffRole, isValidStaffRole, getDefaultRole } from "./permissions";
import * as logger from "./logger";

/**
 * Get the current user's staff role from Clerk metadata
 *
 * SSR-safe - uses Clerk server APIs only
 * Never throws - always returns a valid StaffRole
 * Defaults to "shopper" on any error
 *
 * @returns StaffRole - User's role (defaults to "shopper")
 */
export async function getUserRole(): Promise<StaffRole> {
  try {
    const authResult = await auth();
    const { userId } = authResult;

    if (!userId) {
      logger.debug("AUTH", "No userId - returning default role");
      return getDefaultRole();
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const metadata = user?.publicMetadata as { staffRole?: string } | undefined;
    const rawRole = metadata?.staffRole;

    if (rawRole && isValidStaffRole(rawRole)) {
      return rawRole;
    }

    logger.debug("AUTH", "Missing staffRole - defaulting to shopper", { userId });
    return getDefaultRole();

  } catch (error) {
    // NEVER crash the page - log and return default
    logger.error("AUTH", "Error fetching user role", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return getDefaultRole();
  }
}
