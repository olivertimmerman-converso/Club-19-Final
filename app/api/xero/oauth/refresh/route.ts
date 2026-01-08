/**
 * Club 19 Sales OS - Xero Token Refresh Endpoint
 *
 * Programmatically refreshes Xero access tokens using refresh tokens.
 * Called by:
 * - Cron job (daily automated refresh)
 * - getValidTokens() when token is expiring soon
 *
 * Xero token lifecycle:
 * - Access token: Expires after 30 minutes
 * - Refresh token: Expires after 60 days of non-use
 * - By refreshing regularly, connection stays alive indefinitely
 */

import { NextRequest, NextResponse } from 'next/server';
import { getXataClient } from '@/src/xata';
import * as logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { userId } = await request.json();

    if (!userId) {
      logger.error('XERO_REFRESH', 'Missing userId in request');
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    logger.info('XERO_REFRESH', 'Starting token refresh', { userId });

    const xata = getXataClient();

    // Get current tokens
    const tokenRecord = await xata.db.XeroTokens
      .filter({ user_id: userId })
      .getFirst();

    if (!tokenRecord) {
      logger.error('XERO_REFRESH', 'No token record found', { userId });
      return NextResponse.json({
        error: 'No token record found',
        message: 'User has not connected Xero',
      }, { status: 404 });
    }

    if (!tokenRecord.refresh_token) {
      logger.error('XERO_REFRESH', 'No refresh token found', { userId });
      return NextResponse.json({
        error: 'No refresh token found',
        message: 'Xero connection needs to be re-authorized',
      }, { status: 404 });
    }

    // Verify environment variables
    if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET) {
      logger.error('XERO_REFRESH', 'Xero credentials not configured');
      return NextResponse.json({
        error: 'Server misconfigured',
        message: 'Xero credentials missing',
      }, { status: 500 });
    }

    // Call Xero token endpoint
    logger.info('XERO_REFRESH', 'Calling Xero token endpoint', { userId });

    const basicAuth = Buffer.from(
      `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenRecord.refresh_token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      logger.error('XERO_REFRESH', 'Xero rejected refresh', {
        userId,
        status: response.status,
        error: errorData,
      });

      // If refresh token is invalid, user needs to reconnect
      if (response.status === 400 || response.status === 401) {
        return NextResponse.json({
          error: 'Refresh token invalid',
          message: 'Please reconnect your Xero account',
          details: errorData.error || errorText,
        }, { status: 401 });
      }

      return NextResponse.json({
        error: 'Refresh failed',
        details: errorData.error || errorText,
      }, { status: response.status });
    }

    const tokens = await response.json();

    logger.info('XERO_REFRESH', 'Received new tokens from Xero', {
      userId,
      expiresIn: tokens.expires_in,
    });

    // Update stored tokens
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await xata.db.XeroTokens.update(tokenRecord.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date(),
    });

    const duration = Date.now() - startTime;
    logger.info('XERO_REFRESH', 'Successfully refreshed tokens', {
      userId,
      expiresAt: expiresAt.toISOString(),
      duration,
    });

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      duration,
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('XERO_REFRESH', 'Error refreshing token', {
      error: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage,
    }, { status: 500 });
  }
}
