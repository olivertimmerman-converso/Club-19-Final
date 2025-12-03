/**
 * Club 19 Sales OS - Role Resolution
 *
 * Server-side helper to get user role from Clerk
 */

import { auth, clerkClient } from "@clerk/nextjs/server";

export type Role = "shopper" | "admin" | "finance" | "superadmin";

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
    const role = (user?.publicMetadata?.role as Role) ?? "shopper";

    return role;
  } catch (error) {
    console.error("[getUserRole] Error fetching user role:", error);
    return "shopper";
  }
}
