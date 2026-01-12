/**
 * Club 19 Sales OS - Xero Connection Health Check
 *
 * GET /api/xero/health
 * Returns the current status of the Xero connection including:
 * - Connection status (connected/disconnected/expired/expiring_soon)
 * - Token age and expiry time
 * - Last refresh timestamp
 * - Warnings about refresh token expiry
 *
 * Useful for monitoring and debugging connection issues.
 */

import { NextResponse } from 'next/server';
import { getXeroHealthStatus } from '@/lib/xero-auth';
import * as logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  logger.info('XERO_HEALTH', 'Health check requested');

  try {
    const health = await getXeroHealthStatus();

    logger.info('XERO_HEALTH', 'Health check result', {
      status: health.status,
      expiresInMinutes: health.expiresInMinutes,
    });

    // Return appropriate HTTP status based on connection state
    const httpStatus = health.status === 'disconnected' ? 503 : 200;

    return NextResponse.json({
      ...health,
      timestamp: new Date().toISOString(),
    }, { status: httpStatus });
  } catch (error: any) {
    logger.error('XERO_HEALTH', 'Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({
      status: 'error',
      message: 'Failed to check Xero connection health',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
