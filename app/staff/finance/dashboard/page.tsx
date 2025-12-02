/**
 * Club 19 Sales OS - Finance Dashboard
 *
 * Complete finance dashboard with KPIs, charts, and financial analytics
 */

"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { MetricCard } from "@/components/ui/MetricCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { getSalesAnalyticsOverview } from "@/lib/api/sales";
import type { AnalyticsOverview } from "@/lib/api/sales";
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingBag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  AlertCircle,
  Building2,
  User,
  Lock,
} from "lucide-react";
import Link from "next/link";

export default function FinanceDashboardPage() {
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
      setError(err.message || "Failed to load finance data");
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
          title="Finance Dashboard"
          subtitle="Financial overview and commission management"
        />
        <PageSection>
          <LoadingBlock message="Loading finance dashboard..." />
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Finance Dashboard"
          subtitle="Financial overview and commission management"
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

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Buyer Type Breakdown
  const buyerTypeData = [
    {
      label: "End Client",
      count: analytics.end_client_sales_count,
      color: "bg-blue-500",
    },
    {
      label: "B2B",
      count: analytics.b2b_sales_count,
      color: "bg-purple-500",
    },
  ];

  const totalSales = analytics.total_sales_count;
  const buyerTypeMax = Math.max(...buyerTypeData.map((d) => d.count));

  // Payment Status Breakdown
  const paymentStatusData = [
    {
      label: "Paid",
      count: analytics.count_paid,
      color: "bg-green-500",
    },
    {
      label: "Unpaid",
      count: analytics.count_unpaid,
      color: "bg-gray-500",
    },
    {
      label: "Overdue",
      count: analytics.count_overdue,
      color: "bg-red-500",
    },
  ];

  const paymentStatusMax = Math.max(...paymentStatusData.map((d) => d.count));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader
        title="Finance Dashboard"
        subtitle="Financial KPIs, payment tracking, and commission lifecycle"
        actions={
          <Link
            href="/staff/finance/commissions"
            className="px-4 py-2 bg-[#F3DFA2] text-[#0A0A0A] rounded-lg hover:bg-[#F3DFA2]/90 transition-colors font-medium"
          >
            Manage Commissions
          </Link>
        }
      />

      {/* Section 1: Financial KPIs */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial KPIs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Sales"
            value={analytics.total_sales_count}
            icon={ShoppingBag}
            subtitle="all time"
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(analytics.total_revenue_inc_vat)}
            icon={DollarSign}
            subtitle="inc VAT"
          />
          <MetricCard
            title="Total Margin"
            value={formatCurrency(analytics.total_margin)}
            icon={TrendingUp}
            subtitle="commissionable"
          />
          <MetricCard
            title="Avg Margin"
            value={formatPercent(analytics.average_margin_percent)}
            icon={Percent}
            subtitle="across all sales"
          />
        </div>
      </div>

      {/* Section 2: Payment Lifecycle */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Lifecycle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Paid Sales"
            value={analytics.count_paid}
            icon={CheckCircle}
            subtitle="completed payments"
          />
          <MetricCard
            title="Unpaid Sales"
            value={analytics.count_unpaid}
            icon={XCircle}
            subtitle="awaiting payment"
          />
          <MetricCard
            title="Overdue Sales"
            value={analytics.count_overdue}
            icon={AlertTriangle}
            subtitle="past due date"
          />
          <MetricCard
            title="B2B Sales"
            value={analytics.b2b_sales_count}
            icon={Building2}
            subtitle="business transactions"
          />
        </div>
      </div>

      {/* Section 3: Authenticity & Errors */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Authenticity & Quality
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="High Risk Items"
            value={analytics.authenticity_high_risk_count}
            icon={Shield}
            subtitle="authenticity issues"
          />
          <MetricCard
            title="Missing Receipts"
            value={analytics.authenticity_missing_receipt_count}
            icon={AlertCircle}
            subtitle="supplier docs needed"
          />
          <MetricCard
            title="Total Errors"
            value={analytics.errors_count_total}
            icon={AlertCircle}
            subtitle="system errors"
          />
          <MetricCard
            title="Commissionable Sales"
            value={analytics.count_paid}
            icon={Lock}
            subtitle="ready for commission"
          />
        </div>
      </div>

      {/* Section 4: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Buyer Type Breakdown Chart */}
        <PageSection title="Sales by Buyer Type">
          <div className="space-y-4">
            {buyerTypeData.map((item) => {
              const percentage =
                totalSales > 0 ? ((item.count / totalSales) * 100).toFixed(1) : "0.0";
              const barWidth = buyerTypeMax > 0 ? (item.count / buyerTypeMax) * 100 : 0;

              return (
                <div key={item.label} className="space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{item.count} sales</span>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    >
                      {barWidth > 15 && (
                        <span className="text-xs font-medium text-white">{item.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User size={20} className="text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">End Client</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.end_client_sales_count}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">B2B</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.b2b_sales_count}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageSection>

        {/* Payment Status Breakdown Chart */}
        <PageSection title="Payment Status Breakdown">
          <div className="space-y-4">
            {paymentStatusData.map((item) => {
              const percentage =
                totalSales > 0 ? ((item.count / totalSales) * 100).toFixed(1) : "0.0";
              const barWidth =
                paymentStatusMax > 0 ? (item.count / paymentStatusMax) * 100 : 0;

              return (
                <div key={item.label} className="space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{item.count} sales</span>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    >
                      {barWidth > 15 && (
                        <span className="text-xs font-medium text-white">{item.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Paid</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.count_paid}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">Unpaid</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.count_unpaid}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" />
                <div>
                  <div className="text-sm text-gray-600">Overdue</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analytics.count_overdue}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageSection>
      </div>

      {/* Quick Actions */}
      <PageSection title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/staff/finance/overdue"
            className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-[#F3DFA2] transition-all group"
          >
            <AlertTriangle size={32} className="text-red-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Manage Overdue Sales
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Track and chase {analytics.count_overdue} overdue payments
            </p>
            <span className="text-sm font-medium text-[#F3DFA2] group-hover:underline">
              View Overdue →
            </span>
          </Link>

          <Link
            href="/staff/finance/commissions"
            className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-[#F3DFA2] transition-all group"
          >
            <Lock size={32} className="text-[#F3DFA2] mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Commission Lifecycle
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Lock paid sales and process commissions
            </p>
            <span className="text-sm font-medium text-[#F3DFA2] group-hover:underline">
              Manage Cycle →
            </span>
          </Link>

          <Link
            href="/staff/admin/analytics"
            className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-[#F3DFA2] transition-all group"
          >
            <TrendingUp size={32} className="text-gray-900 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Detailed Analytics
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              View comprehensive sales and revenue analytics
            </p>
            <span className="text-sm font-medium text-[#F3DFA2] group-hover:underline">
              View Analytics →
            </span>
          </Link>
        </div>
      </PageSection>
    </div>
  );
}
