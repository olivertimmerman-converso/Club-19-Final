/**
 * Club 19 Sales OS - Finance Commissions Cycle
 *
 * Commission lifecycle management - lock paid sales and process commissions
 * NOTE: Simplified implementation - backend APIs not yet available
 */

"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { MetricCard } from "@/components/ui/MetricCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { getSalesAnalyticsOverview } from "@/lib/api/sales";
import type { AnalyticsOverview } from "@/lib/api/sales";
import { Lock, DollarSign, CheckCircle, TrendingUp } from "lucide-react";

export default function FinanceCommissionsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const analyticsData = await getSalesAnalyticsOverview();
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.message || "Failed to load commission data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Commission Lifecycle"
          subtitle="Lock paid sales and process commission payments"
        />
        <PageSection>
          <LoadingBlock message="Loading commission data..." />
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Commission Lifecycle"
          subtitle="Lock paid sales and process commission payments"
        />
        <PageSection>
          <ErrorBlock message={error} onRetry={fetchData} />
        </PageSection>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      <PageHeader
        title="Commission Lifecycle"
        subtitle="Month-end workflow for locking sales and paying commissions"
      />

      {/* Month-End Snapshot */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Month-End Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Paid Sales"
            value={analytics.count_paid}
            icon={CheckCircle}
            subtitle="ready to lock"
          />
          <MetricCard
            title="Locked Sales"
            value={0}
            icon={Lock}
            subtitle="ready for commission"
          />
          <MetricCard
            title="Commission Paid"
            value={0}
            icon={DollarSign}
            subtitle="completed"
          />
          <MetricCard
            title="Total Margin"
            value={formatCurrency(analytics.total_margin)}
            icon={TrendingUp}
            subtitle="commissionable"
          />
        </div>
      </div>

      {/* Lifecycle Actions */}
      <PageSection title="Commission Lifecycle Actions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lock Paid Sales Card */}
          <div className="p-8 bg-white border-2 border-[#F3DFA2] rounded-lg">
            <div className="flex items-center justify-center w-16 h-16 bg-[#F3DFA2]/10 rounded-full mb-4">
              <Lock size={32} className="text-[#F3DFA2]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Lock All Paid Sales
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Lock all paid invoices to prepare for commission calculation. This prevents further
              edits to paid sales.
            </p>
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-1">Ready to Lock</div>
              <div className="text-3xl font-bold text-gray-900">{analytics.count_paid} sales</div>
            </div>
            <button
              disabled
              className="w-full px-6 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
            >
              API Not Available
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Backend endpoint required: POST /api/finance/lock-paid-sales
            </p>
          </div>

          {/* Pay Commissions Card */}
          <div className="p-8 bg-white border-2 border-gray-200 rounded-lg">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <DollarSign size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pay Commissions</h3>
            <p className="text-sm text-gray-600 mb-6">
              Process commission payments for all locked sales. This marks sales as commission_paid
              and is irreversible.
            </p>
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-1">Ready to Pay</div>
              <div className="text-3xl font-bold text-gray-900">0 sales</div>
            </div>
            <button
              disabled
              className="w-full px-6 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
            >
              API Not Available
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Backend endpoint required: POST /api/finance/pay-commissions
            </p>
          </div>
        </div>
      </PageSection>

      {/* Info Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Commission Lifecycle - Implementation Note
        </h3>
        <p className="text-sm text-blue-700">
          This page demonstrates the UI for the commission lifecycle workflow. The backend API
          endpoints (<code className="bg-blue-100 px-1 rounded">
            /api/finance/lock-paid-sales
          </code>{" "}
          and <code className="bg-blue-100 px-1 rounded">/api/finance/pay-commissions</code>) need
          to be implemented to enable full functionality. The workflow includes confirmation
          modals, result displays, and error handling once the APIs are available.
        </p>
      </div>
    </div>
  );
}
