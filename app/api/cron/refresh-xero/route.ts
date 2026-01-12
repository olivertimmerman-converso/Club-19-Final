/**
 * Club 19 Sales OS - Xero Token Refresh Cron Job
 *
 * STAGE 1: Single Integration User Architecture
 *
 * Automatically refreshes Xero tokens for the integration user to keep connection alive.
 * Xero access tokens expire after 30 minutes, refresh tokens after 60 days of non-use.
 *
 * SCHEDULE: Every 10 minutes (see vercel.json for cron expression)
 * This aggressive schedule ensures:
 * - Tokens are always fresh (well before 30-minute expiry)
 * - Users never see "Xero Connection Required" errors
 * - Refresh tokens stay active (never go 60 days unused)
 *
 * IMPORTANT: Only the cron job can refresh tokens (forceCron: true).
 * API routes will use existing tokens without refreshing to prevent race conditions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { refreshTokens, getValidTokens } from '@/lib/xero-auth';
import { getXataClient } from '@/src/xata';
import * as logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Integration user ID - single source of truth for Xero tokens
const INTEGRATION_USER_ID = process.env.XERO_INTEGRATION_CLERK_USER_ID;

interface XeroMetadata {
  xero?: {
    accessToken?: string;
    refreshToken?: string;
    tenantId?: string;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('XERO_CRON', 'Starting scheduled token refresh (Stage 1 - Integration User)');

  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    logger.error('XERO_CRON', 'CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== expectedAuth) {
    logger.error('XERO_CRON', 'Unauthorized cron request', {
      hasAuth: !!authHeader,
      authPrefix: authHeader?.substring(0, 10),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Stage 1: Require integration user ID
  if (!INTEGRATION_USER_ID) {
    logger.error('XERO_CRON', 'XERO_INTEGRATION_CLERK_USER_ID not configured');
    return NextResponse.json({
      error: 'XERO_INTEGRATION_CLERK_USER_ID not configured',
      message: 'Set this environment variable to enable Xero integration'
    }, { status: 500 });
  }

  try {
    // Stage 1: Get integration user directly (no scanning)
    const user = await clerkClient.users.getUser(INTEGRATION_USER_ID);
    const meta = user.privateMetadata as XeroMetadata;

    // Check if integration user has Xero tokens
    if (!meta.xero?.accessToken || !meta.xero?.refreshToken || !meta.xero?.tenantId) {
      logger.info('XERO_CRON', 'Integration user has no Xero connection', {
        integrationUserId: INTEGRATION_USER_ID,
      });
      return NextResponse.json({
        message: 'Integration user has no Xero connection. Please connect Xero.',
        refreshed: 0,
        failed: 0,
        duration: Date.now() - startTime,
      });
    }

    logger.info('XERO_CRON', 'Found Xero tokens on integration user', {
      integrationUserId: INTEGRATION_USER_ID,
    });

    let refreshed = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      logger.info('XERO_CRON', 'Refreshing token for integration user', {
        integrationUserId: INTEGRATION_USER_ID,
      });

      // STAGE 1: Pass forceCron: true to allow actual refresh
      // Only the cron job has permission to refresh tokens
      await refreshTokens(INTEGRATION_USER_ID, { forceCron: true });

      // Verify the refresh worked by making a test API call
      const tokens = await getValidTokens(INTEGRATION_USER_ID);
      if (!tokens || !tokens.accessToken) {
        throw new Error('Token refresh succeeded but no access token returned');
      }

      const testResponse = await fetch('https://api.xero.com/connections', {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!testResponse.ok) {
        throw new Error(`Xero API verification failed: ${testResponse.status}`);
      }

      logger.info('XERO_CRON', 'Token refreshed and verified successfully', {
        integrationUserId: INTEGRATION_USER_ID,
      });
      refreshed++;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('XERO_CRON', 'Error refreshing token', {
        integrationUserId: INTEGRATION_USER_ID,
        error: errorMessage,
      });
      errors.push(`Integration user: ${errorMessage}`);
      failed++;

      // Log critical error to Xata for visibility
      try {
        const xata = getXataClient();
        await xata.db.Errors.create({
          severity: 'high',
          source: 'xero-cron',
          message: [`Cron refresh failed for integration user: ${errorMessage}`],
          timestamp: new Date(),
          resolved: false,
        });
      } catch (logErr) {
        logger.error('XERO_CRON', 'Failed to log error to Xata', {
          error: logErr instanceof Error ? logErr.message : String(logErr),
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('XERO_CRON', 'Cron job complete', {
      refreshed,
      failed,
      duration,
    });

    // Send alert if refresh failed
    if (failed > 0 && process.env.ALERT_WEBHOOK_URL) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sales.club19london.com';
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 URGENT: Xero token refresh failed. Admin must reconnect at ${appUrl}/trade/new`,
            priority: 'high',
            errors: errors,
            timestamp: new Date().toISOString(),
          }),
        });
        logger.info('XERO_CRON', 'Alert sent for refresh failure');
      } catch (alertError) {
        logger.error('XERO_CRON', 'Failed to send alert', {
          error: alertError instanceof Error ? alertError.message : String(alertError),
        });
      }
    }

    return NextResponse.json({
      success: true,
      refreshed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      alertSent: failed > 0 && !!process.env.ALERT_WEBHOOK_URL,
      duration,
      architecture: 'stage1-integration-user',
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('XERO_CRON', 'Fatal error in cron job', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      error: 'Cron job failed',
      details: errorMessage,
    }, { status: 500 });
  }
}
