/**
 * Club 19 Sales OS - Current User Helper
 *
 * Gets current user information from Clerk for filtering
 */

import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import * as logger from './logger';

export interface CurrentUser {
  userId: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * Get the current logged-in user's information from Clerk
 *
 * Used for filtering shopper data to match sales.shopper_name
 *
 * @returns CurrentUser | null - User info or null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    // Get userId from Clerk auth
    const { userId } = await auth();
    logger.info('AUTH', 'getCurrentUser: auth() resolved', { userId: userId || 'null' });

    if (!userId) {
      logger.warn('AUTH', 'getCurrentUser: No userId from auth() - user not authenticated');
      return null;
    }

    // Fetch full user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    logger.info('AUTH', 'getCurrentUser: Clerk user fetched', {
      userId: user.id,
      firstName: user.firstName || 'null',
      lastName: user.lastName || 'null',
      emailCount: user.emailAddresses?.length || 0,
    });

    // Build full name (matches shopper_name format)
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    if (!fullName) {
      logger.warn('AUTH', 'getCurrentUser: fullName is empty - Clerk profile may be incomplete', {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }

    return {
      userId: user.id,
      fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0]?.emailAddress || null,
    };
  } catch (error) {
    logger.error('AUTH', 'getCurrentUser: Failed to fetch user', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
    });
    return null;
  }
}
