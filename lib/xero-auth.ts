import * as logger from './logger';
import { clerkClient } from "@clerk/nextjs/server";

/**
 * STAGE 1: Single Integration User Architecture
 *
 * All Xero operations use a single designated integration user.
 * Set XERO_INTEGRATION_CLERK_USER_ID in environment to enable.
 *
 * Benefits:
 * - No user scanning (faster, more reliable)
 * - Single source of truth for tokens
 * - Cron-only refresh prevents race conditions
 */
const INTEGRATION_USER_ID = process.env.XERO_INTEGRATION_CLERK_USER_ID;

/**
 * Type-safe Xero metadata stored in Clerk privateMetadata
 */
interface XeroMetadata {
  xero?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    tenantId: string;
    tenantName?: string;
    connectedAt?: number;
    refreshedAt?: number; // Timestamp of last successful refresh
  };
}

/**
 * Xero token data
 */
export interface XeroTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tenantId: string;
  tenantName?: string;
  refreshedAt?: number; // Timestamp of last successful refresh
}

/**
 * Xero token refresh response
 */
interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get Xero tokens from the designated integration user
 *
 * STAGE 1: Uses single integration user instead of scanning all users.
 * This is faster, more reliable, and prevents race conditions.
 *
 * @param _userId - Ignored in Stage 1 (kept for API compatibility)
 * @throws Error if integration user not configured or Xero not connected
 */
export async function getTokens(_userId: string): Promise<XeroTokens> {
  // Stage 1: Use integration user directly
  if (!INTEGRATION_USER_ID) {
    logger.error('XERO_AUTH', 'XERO_INTEGRATION_CLERK_USER_ID not configured');
    throw new Error("Xero integration not configured. Please set XERO_INTEGRATION_CLERK_USER_ID.");
  }

  logger.info('XERO_AUTH', `Getting tokens from integration user: ${INTEGRATION_USER_ID}`);

  const user = await clerkClient.users.getUser(INTEGRATION_USER_ID);
  const meta = user.privateMetadata as XeroMetadata;

  if (meta.xero?.accessToken && meta.xero?.refreshToken && meta.xero?.tenantId) {
    logger.info('XERO_AUTH', `Tokens found for integration user, tenant: ${meta.xero.tenantId}`);
    return {
      accessToken: meta.xero.accessToken,
      refreshToken: meta.xero.refreshToken,
      expiresAt: meta.xero.expiresAt,
      tenantId: meta.xero.tenantId,
      tenantName: meta.xero.tenantName,
      refreshedAt: meta.xero.refreshedAt,
    };
  }

  // Integration user exists but no Xero connection
  logger.error('XERO_AUTH', 'Integration user has no Xero connection');
  throw new Error("Xero not connected. Please reconnect Xero.");
}

/**
 * Save Xero tokens to Clerk metadata
 * @param userId - User ID to save tokens to (should be integration user)
 * @param tokens - Token data to save
 * @param isRefresh - If true, updates refreshedAt instead of connectedAt
 */
export async function saveTokens(userId: string, tokens: XeroTokens, isRefresh: boolean = false): Promise<void> {
  logger.info('XERO_AUTH', `Saving tokens for user: ${userId} (isRefresh: ${isRefresh})`);

  // Get existing metadata to preserve connectedAt on refresh
  const user = await clerkClient.users.getUser(userId);
  const existingMeta = user.privateMetadata as XeroMetadata;
  const existingConnectedAt = existingMeta.xero?.connectedAt;

  const now = Date.now();

  await clerkClient.users.updateUser(userId, {
    privateMetadata: {
      xero: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        tenantId: tokens.tenantId,
        tenantName: tokens.tenantName,
        // Preserve original connection date on refresh, set new one on initial connect
        connectedAt: isRefresh && existingConnectedAt ? existingConnectedAt : now,
        // Track when tokens were last refreshed
        refreshedAt: now,
      },
    },
  });

  logger.info('XERO_AUTH', 'Tokens saved successfully', {
    refreshedAt: new Date(now).toISOString(),
    expiresAt: new Date(tokens.expiresAt).toISOString(),
  });
}

/**
 * Get the integration user ID
 * STAGE 1: Returns the configured integration user instead of scanning
 */
function getIntegrationUserId(): string | null {
  return INTEGRATION_USER_ID || null;
}

/**
 * Refresh options for controlling when refresh is allowed
 */
interface RefreshOptions {
  /** Set to true when called from cron job - ONLY cron can perform actual refresh */
  forceCron?: boolean;
}

/**
 * Refresh Xero access token using refresh token
 * Automatically updates Clerk metadata with new tokens
 *
 * STAGE 1: CRON-ONLY REFRESH
 * To prevent race conditions, only the cron job can actually refresh tokens.
 * API calls will just return existing tokens (which should be fresh from cron).
 *
 * @param userId - Ignored in Stage 1, uses integration user
 * @param options - Pass { forceCron: true } from cron job to allow actual refresh
 * @throws Error if refresh fails
 */
export async function refreshTokens(userId: string, options?: RefreshOptions): Promise<XeroTokens> {
  // STAGE 1: Only cron job can refresh to prevent race conditions
  if (!options?.forceCron) {
    logger.info('XERO_AUTH', 'Token refresh skipped - only cron can refresh to prevent race conditions');
    // Return existing tokens instead of refreshing
    return await getTokens(userId);
  }

  logger.info('XERO_AUTH', `Refreshing tokens (forceCron=true)`);

  // Get current tokens from integration user
  const currentTokens = await getTokens(userId);

  // Use integration user for saving refreshed tokens
  const integrationUserId = getIntegrationUserId();
  if (!integrationUserId) {
    throw new Error("XERO_INTEGRATION_CLERK_USER_ID not configured");
  }

  logger.info('XERO_AUTH', `Using integration user: ${integrationUserId}`);

  // Validate environment
  const clientId = process.env.NEXT_PUBLIC_XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('XERO_AUTH', 'Missing Xero OAuth configuration');
    throw new Error("Xero OAuth configuration missing on server");
  }

  try {
    logger.info('XERO_AUTH', 'Calling Xero token refresh endpoint...');
    const refreshResponse = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: currentTokens.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      logger.error('XERO_AUTH', 'Token refresh failed', {
        status: refreshResponse.status,
        error: errorText,
      });

      // If refresh token is invalid (401/400), owner needs to reconnect
      if (refreshResponse.status === 400 || refreshResponse.status === 401) {
        throw new Error("Xero session expired. Please ask an admin to reconnect Xero.");
      }

      throw new Error(`Failed to refresh Xero token: ${errorText}`);
    }

    const newTokenData: XeroTokenResponse = await refreshResponse.json();
    const newExpiresAt = Date.now() + newTokenData.expires_in * 1000;

    logger.info('XERO_AUTH', `Token refreshed successfully (expires in ${newTokenData.expires_in}s)`);

    // Create new tokens object
    const now = Date.now();
    const newTokens: XeroTokens = {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token,
      expiresAt: newExpiresAt,
      tenantId: currentTokens.tenantId,
      tenantName: currentTokens.tenantName,
      refreshedAt: now,
    };

    // Save to the integration user's account
    // Pass isRefresh=true to preserve original connectedAt timestamp
    await saveTokens(integrationUserId, newTokens, true);
    logger.info('XERO_AUTH', `Refreshed tokens saved to integration user: ${integrationUserId}`);

    return newTokens;
  } catch (error: any) {
    logger.error('XERO_AUTH', 'Token refresh error', { error: error as any } as any);
    throw error;
  }
}

/**
 * Get valid Xero tokens, automatically refreshing if expired
 * This is the main function to use in API routes
 *
 * @param userId - Clerk user ID
 * @returns Valid access token and tenant ID
 * @throws Error if Xero is not connected or refresh fails
 */
export async function getValidTokens(userId: string): Promise<XeroTokens> {
  logger.info('XERO_AUTH', `Getting valid tokens for user: ${userId}`);

  // Get current tokens
  const tokens = await getTokens(userId);

  // Defensive check: if expiresAt is missing or invalid, force refresh
  if (!tokens.expiresAt || typeof tokens.expiresAt !== 'number') {
    logger.error('XERO_AUTH', 'Token expiresAt is invalid, forcing refresh', {
      expiresAt: tokens.expiresAt,
      type: typeof tokens.expiresAt,
    });
    return await refreshTokens(userId);
  }

  // Check if token needs refresh (10 minutes before expiry for proactive refresh)
  // This ensures tokens are always fresh and prevents expiry during API calls
  const now = Date.now();
  const expiresIn = tokens.expiresAt - now;
  const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
  const needsRefresh = expiresIn < tenMinutes;

  logger.info('XERO_AUTH', 'Token status', {
    now: new Date(now).toISOString(),
    expiresAt: new Date(tokens.expiresAt).toISOString(),
    expiresIn: Math.floor(expiresIn / 1000) + "s",
    needsRefresh,
  });

  if (!needsRefresh) {
    logger.info('XERO_AUTH', 'Token still valid, using existing token');
    return tokens;
  }

  // Token expired or about to expire, refresh it
  logger.info('XERO_AUTH', 'Token expiring soon, refreshing proactively...');
  return await refreshTokens(userId);
}

/**
 * Check if Xero is connected via the integration user
 *
 * STAGE 1: Checks integration user directly instead of scanning all users.
 *
 * @param _userId - Ignored in Stage 1
 * @returns true if integration user has valid Xero tokens
 */
export async function hasXeroConnection(_userId: string): Promise<boolean> {
  try {
    if (!INTEGRATION_USER_ID) {
      logger.info('XERO_AUTH', 'XERO_INTEGRATION_CLERK_USER_ID not configured');
      return false;
    }

    const user = await clerkClient.users.getUser(INTEGRATION_USER_ID);
    const meta = user.privateMetadata as XeroMetadata;
    const hasConnection = !!(
      meta.xero?.accessToken &&
      meta.xero?.refreshToken &&
      meta.xero?.tenantId
    );

    logger.info('XERO_AUTH', `Integration user Xero connection: ${hasConnection}`);
    return hasConnection;
  } catch (error) {
    logger.error('XERO_AUTH', 'Error checking connection', { error: error as any });
    return false;
  }
}

/**
 * Disconnect Xero account (clear all metadata)
 * Useful for "Disconnect" button in UI
 */
export async function disconnectXero(userId: string): Promise<void> {
  logger.info('XERO_AUTH', `Disconnecting Xero for user: ${userId}`);

  await clerkClient.users.updateUser(userId, {
    privateMetadata: {
      xero: null,
    },
  });

  logger.info('XERO_AUTH', 'Xero disconnected successfully');
}

/**
 * Wrapper function to ensure fresh Xero tokens before API calls
 * with automatic retry on 401 errors.
 *
 * This provides a robust way to make Xero API calls:
 * 1. Gets fresh tokens (proactively refreshing if near expiry)
 * 2. Executes the API call
 * 3. If 401 error, forces token refresh and retries once
 *
 * @param userId - Clerk user ID
 * @param apiCall - Function that makes the Xero API call
 * @returns Result of the API call
 * @throws Error if Xero is not connected or API call fails after retry
 *
 * @example
 * const invoice = await withFreshXeroToken(userId, async (tokens) => {
 *   return await createXeroInvoice(tokens.tenantId, tokens.accessToken, payload);
 * });
 */
export async function withFreshXeroToken<T>(
  userId: string,
  apiCall: (tokens: XeroTokens) => Promise<T>
): Promise<T> {
  logger.info('XERO_AUTH', 'withFreshXeroToken: Getting fresh tokens');

  // Get fresh tokens (will proactively refresh if near expiry)
  const tokens = await getValidTokens(userId);

  try {
    return await apiCall(tokens);
  } catch (error: any) {
    // Check for 401 Unauthorized error
    const is401 = error.status === 401 ||
                  error.statusCode === 401 ||
                  error.message?.includes('401') ||
                  error.message?.includes('Unauthorized');

    if (is401) {
      logger.warn('XERO_AUTH', 'withFreshXeroToken: Got 401, forcing token refresh and retrying');

      // Force refresh tokens
      const freshTokens = await refreshTokens(userId);

      // Retry the API call with fresh tokens
      return await apiCall(freshTokens);
    }

    // Not a 401 error, re-throw
    throw error;
  }
}

/**
 * Get Xero connection health status
 * Useful for monitoring and debugging connection issues
 *
 * STAGE 1: Checks integration user directly instead of scanning all users.
 *
 * @param _userId - Ignored in Stage 1
 * @returns Health status object
 */
export async function getXeroHealthStatus(_userId?: string): Promise<{
  status: 'connected' | 'disconnected' | 'expired' | 'expiring_soon';
  message: string;
  tokenAgeMinutes?: number;
  expiresInMinutes?: number;
  refreshedAt?: string;
  connectedAt?: string;
  tenantName?: string;
}> {
  try {
    if (!INTEGRATION_USER_ID) {
      return {
        status: 'disconnected',
        message: 'Xero integration not configured. Set XERO_INTEGRATION_CLERK_USER_ID.',
      };
    }

    const user = await clerkClient.users.getUser(INTEGRATION_USER_ID);
    const meta = user.privateMetadata as XeroMetadata;

    if (meta.xero?.accessToken && meta.xero?.refreshToken && meta.xero?.tenantId) {
      const now = Date.now();
      const expiresAt = meta.xero.expiresAt || 0;
      const refreshedAt = meta.xero.refreshedAt || meta.xero.connectedAt || 0;
      const connectedAt = meta.xero.connectedAt || 0;

      const expiresInMs = expiresAt - now;
      const expiresInMinutes = Math.round(expiresInMs / 1000 / 60);
      const tokenAgeMinutes = Math.round((now - refreshedAt) / 1000 / 60);

      // Check refresh token expiry (60 days from last refresh)
      const refreshTokenExpiresAt = refreshedAt + (60 * 24 * 60 * 60 * 1000);
      const daysUntilRefreshExpiry = Math.round((refreshTokenExpiresAt - now) / (24 * 60 * 60 * 1000));

      if (expiresInMs < 0) {
        return {
          status: 'expired',
          message: `Access token expired ${Math.abs(expiresInMinutes)} minutes ago. Waiting for cron refresh.`,
          tokenAgeMinutes,
          expiresInMinutes,
          refreshedAt: refreshedAt ? new Date(refreshedAt).toISOString() : undefined,
          connectedAt: connectedAt ? new Date(connectedAt).toISOString() : undefined,
          tenantName: meta.xero.tenantName,
        };
      }

      if (expiresInMinutes < 10) {
        return {
          status: 'expiring_soon',
          message: `Access token expires in ${expiresInMinutes} minutes. Cron will refresh soon.`,
          tokenAgeMinutes,
          expiresInMinutes,
          refreshedAt: refreshedAt ? new Date(refreshedAt).toISOString() : undefined,
          connectedAt: connectedAt ? new Date(connectedAt).toISOString() : undefined,
          tenantName: meta.xero.tenantName,
        };
      }

      let message = `Connected to ${meta.xero.tenantName || 'Xero'}. Token valid for ${expiresInMinutes} minutes.`;
      if (daysUntilRefreshExpiry < 7) {
        message += ` WARNING: Refresh token expires in ${daysUntilRefreshExpiry} days!`;
      }

      return {
        status: 'connected',
        message,
        tokenAgeMinutes,
        expiresInMinutes,
        refreshedAt: refreshedAt ? new Date(refreshedAt).toISOString() : undefined,
        connectedAt: connectedAt ? new Date(connectedAt).toISOString() : undefined,
        tenantName: meta.xero.tenantName,
      };
    }

    return {
      status: 'disconnected',
      message: 'Xero not connected. Please reconnect Xero.',
    };
  } catch (error) {
    logger.error('XERO_AUTH', 'Error getting health status', { error: error as any });
    return {
      status: 'disconnected',
      message: 'Error checking Xero connection status.',
    };
  }
}
