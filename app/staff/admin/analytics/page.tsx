/**
 * Club 19 Sales OS - Admin Analytics Dashboard
 *
 * Analytics overview with CSS-only bar charts
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
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingBag,
  Building2,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function AdminAnalyticsPage() {
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
      setError(err.message || "Failed to load analytics data");
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
          title="Analytics Dashboard"
          subtitle="Sales insights and performance metrics"
        />
        <PageSection>
          <LoadingBlock message="Loading analytics..." />
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Analytics Dashboard"
          subtitle="Sales insights and performance metrics"
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
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Comprehensive sales performance and insights"
      />

      {/* Key Performance Indicators */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Key Performance Indicators
        </h2>
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

      {/* Buyer Type Breakdown Chart */}
      <PageSection title="Buyer Type Breakdown">
        <div className="space-y-4">
          {buyerTypeData.map((item) => {
            const percentage =
              totalSales > 0 ? ((item.count / totalSales) * 100).toFixed(1) : "0.0";
            const barWidth =
              buyerTypeMax > 0 ? (item.count / buyerTypeMax) * 100 : 0;

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
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
                      <span className="text-xs font-medium text-white">
                        {item.count}
                      </span>
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
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
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
                      <span className="text-xs font-medium text-white">
                        {item.count}
                      </span>
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
              <XCircle size={20} className="text-red-600" />
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

      {/* Financial Summary */}
      <PageSection title="Financial Summary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(analytics.total_revenue_inc_vat)}
            </div>
            <div className="text-xs text-gray-500">inc VAT</div>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Buy Cost</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(analytics.total_buy_cost)}
            </div>
            <div className="text-xs text-gray-500">supplier cost</div>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Margin</div>
            <div className="text-2xl font-bold text-[#F3DFA2] mb-2">
              {formatCurrency(analytics.total_margin)}
            </div>
            <div className="text-xs text-gray-500">commissionable</div>
          </div>
        </div>
      </PageSection>

      {/* Authenticity & Quality */}
      <PageSection title="Authenticity & Quality">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700 mb-1">High Risk Items</div>
            <div className="text-3xl font-bold text-red-700 mb-2">
              {analytics.authenticity_high_risk_count}
            </div>
            <div className="text-xs text-red-600">
              authenticity concerns requiring review
            </div>
          </div>

          <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-sm text-orange-700 mb-1">Missing Receipts</div>
            <div className="text-3xl font-bold text-orange-700 mb-2">
              {analytics.authenticity_missing_receipt_count}
            </div>
            <div className="text-xs text-orange-600">
              sales without supplier documentation
            </div>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
