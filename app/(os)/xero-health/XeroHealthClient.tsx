/**
 * Club 19 Sales OS - Xero Health Dashboard Client
 *
 * Displays comprehensive Xero connection health information
 * with auto-refresh and reconnect functionality.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { StaffRole } from "@/lib/permissions";

interface XeroHealthData {
  status: "connected" | "disconnected" | "expired" | "expiring_soon" | "error";
  message: string;
  tokenAgeMinutes?: number;
  expiresInMinutes?: number;
  refreshedAt?: string;
  connectedAt?: string;
  tenantName?: string;
  timestamp?: string;
  error?: string;
}

interface XeroHealthClientProps {
  role: StaffRole;
}

export function XeroHealthClient({ role }: XeroHealthClientProps) {
  const [health, setHealth] = useState<XeroHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/xero/health");
      const data = await response.json();
      setHealth(data);
      setLastFetch(new Date());
    } catch (error) {
      setHealth({
        status: "error",
        message: "Failed to fetch health status",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusIcon = () => {
    switch (health?.status) {
      case "connected":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "expiring_soon":
        return <Clock className="w-8 h-8 text-yellow-500" />;
      case "expired":
        return <AlertTriangle className="w-8 h-8 text-orange-500" />;
      case "disconnected":
      case "error":
      default:
        return <XCircle className="w-8 h-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (health?.status) {
      case "connected":
        return "border-green-500 bg-green-50";
      case "expiring_soon":
        return "border-yellow-500 bg-yellow-50";
      case "expired":
        return "border-orange-500 bg-orange-50";
      case "disconnected":
      case "error":
      default:
        return "border-red-500 bg-red-50";
    }
  };

  const getStatusLabel = () => {
    switch (health?.status) {
      case "connected":
        return "Connected";
      case "expiring_soon":
        return "Expiring Soon";
      case "expired":
        return "Token Expired";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "Unknown";
    return new Date(isoString).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Xero Health Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and manage the Xero accounting integration
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Main Status Card */}
      <div className={`rounded-xl border-2 p-6 mb-6 ${getStatusColor()}`}>
        <div className="flex items-start gap-4">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {getStatusLabel()}
              </h2>
              {health?.tenantName && (
                <span className="px-3 py-1 bg-white/50 rounded-full text-sm font-medium">
                  {health.tenantName}
                </span>
              )}
            </div>
            <p className="text-gray-700">{health?.message}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Token Age */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500 mb-1">Token Age</div>
          <div className="text-2xl font-semibold text-gray-900">
            {health?.tokenAgeMinutes !== undefined
              ? `${health.tokenAgeMinutes} min`
              : "N/A"}
          </div>
          <div className="text-xs text-gray-400 mt-1">Since last refresh</div>
        </div>

        {/* Expires In */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500 mb-1">Expires In</div>
          <div
            className={`text-2xl font-semibold ${
              health?.expiresInMinutes !== undefined &&
              health.expiresInMinutes < 10
                ? "text-orange-600"
                : "text-gray-900"
            }`}
          >
            {health?.expiresInMinutes !== undefined
              ? `${health.expiresInMinutes} min`
              : "N/A"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Access token validity
          </div>
        </div>

        {/* Last Refreshed */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500 mb-1">Last Refreshed</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDateTime(health?.refreshedAt)}
          </div>
          <div className="text-xs text-gray-400 mt-1">By cron job</div>
        </div>

        {/* Connected Since */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500 mb-1">Connected Since</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDateTime(health?.connectedAt)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Initial OAuth</div>
        </div>
      </div>

      {/* Actions */}
      {(health?.status === "disconnected" || health?.status === "expired") && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 font-medium">
                {health.status === "expired"
                  ? "Token expired - automatic refresh should occur within 10 minutes."
                  : "Xero is disconnected. Invoice creation is disabled."}
              </p>
              <p className="text-amber-700 text-sm mt-1">
                {health.status === "expired"
                  ? "If the cron job is not running, you may need to manually reconnect."
                  : "Click the button below to initiate a new OAuth connection."}
              </p>
            </div>
            <a
              href="/api/xero/oauth/authorize"
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              Reconnect Xero
            </a>
          </div>
        </div>
      )}

      {/* Architecture Info */}
      <div className="bg-gray-50 rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Integration Architecture
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500 mb-1">Token Storage</div>
            <div className="text-gray-900">
              Single Integration User (Clerk privateMetadata)
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Refresh Strategy</div>
            <div className="text-gray-900">Cron-only (every 10 minutes)</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Token Lifecycle</div>
            <div className="text-gray-900">
              Access: 30 min / Refresh: 60 days
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {lastFetch && (
        <div className="text-xs text-gray-400 mt-4 text-center">
          Last checked: {lastFetch.toLocaleTimeString()} (auto-refreshes every
          30s)
        </div>
      )}
    </div>
  );
}
