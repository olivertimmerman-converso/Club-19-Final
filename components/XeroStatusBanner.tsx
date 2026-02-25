/**
 * Club 19 Sales OS - Xero Status Banner
 *
 * STAGE 1: Simplified reconnect UX
 *
 * Shows a warning banner when Xero is disconnected.
 * ANY user can reconnect (will save to integration user).
 * Visible to admin/superadmin/finance/operations/founder roles.
 */

"use client";

import { useEffect, useState } from "react";

interface XeroStatusBannerProps {
  role: string | null;
}

type XeroHealthStatus = 'connected' | 'disconnected' | 'expired' | 'expiring_soon';

export function XeroStatusBanner({ role }: XeroStatusBannerProps) {
  const [xeroStatus, setXeroStatus] = useState<{
    status: XeroHealthStatus;
    checked: boolean;
    message?: string;
  }>({ status: 'connected', checked: false });

  // Only check Xero status for roles that need to know
  const shouldCheck = role && ['admin', 'superadmin', 'finance', 'operations', 'founder'].includes(role);

  useEffect(() => {
    if (!shouldCheck) return;

    async function checkXeroStatus() {
      try {
        const response = await fetch('/api/xero/health');
        const data = await response.json();
        setXeroStatus({
          status: data.status || 'disconnected',
          checked: true,
          message: data.message,
        });
      } catch (error) {
        // If health check fails, assume disconnected
        setXeroStatus({
          status: 'disconnected',
          checked: true,
          message: 'Failed to check Xero status',
        });
      }
    }

    checkXeroStatus();

    // Re-check every 5 minutes (cron runs every 10 mins)
    const interval = setInterval(checkXeroStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [shouldCheck]);

  // Don't show banner if:
  // - Role doesn't need to know
  // - Haven't checked yet
  // - Xero is connected (or just expiring soon - cron will handle)
  if (!shouldCheck || !xeroStatus.checked) {
    return null;
  }

  // Connected or expiring soon - no banner needed (cron will refresh)
  if (xeroStatus.status === 'connected' || xeroStatus.status === 'expiring_soon') {
    return null;
  }

  // Disconnected or expired - show banner
  const isExpired = xeroStatus.status === 'expired';

  return (
    <div className={`${isExpired ? 'bg-yellow-600' : 'bg-red-600'} text-white text-center py-2 px-4`}>
      <span className="font-medium">
        {isExpired
          ? 'Xero token expired. Waiting for automatic refresh...'
          : 'Xero is disconnected. Invoices cannot be created.'}
      </span>
      {/* Stage 1: ANY user can reconnect - tokens are saved to integration user */}
      <a
        href="/api/xero/oauth/authorize"
        className="underline ml-2 hover:text-white/80"
      >
        Reconnect now
      </a>
    </div>
  );
}
