/**
 * Club 19 Sales OS - Shopper Detail Page
 *
 * View individual shopper performance and sales
 * Accessible to: superadmin, founder, operations
 */

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Mail, Award, TrendingUp, DollarSign } from "lucide-react";
import { getXataClient } from "@/src/xata";
import { getUserRole } from "@/lib/getUserRole";
import { canAccess } from "@/lib/rbac";

const xata = getXataClient();

// Helper to format currency
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
};

// Helper to format date
const formatDate = (date: Date | null | string | undefined) => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

interface ShopperDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ShopperDetailPage({
  params,
  searchParams,
}: ShopperDetailPageProps) {
  const role = await getUserRole();

  if (!role || !canAccess("/shoppers", role)) {
    redirect("/unauthorised");
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  // Fetch the shopper
  const shopper = await xata.db.Shoppers.filter({ id }).getFirst();

  if (!shopper) {
    notFound();
  }

  // Date range filtering (default: this month)
  const now = new Date();
  const currentMonth = resolvedSearchParams.month
    ? parseInt(resolvedSearchParams.month as string)
    : now.getMonth();
  const currentYear = resolvedSearchParams.year
    ? parseInt(resolvedSearchParams.year as string)
    : now.getFullYear();

  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  // Calculate YTD dates
  const ytdStart = new Date(currentYear, 0, 1);

  // Fetch sales for this shopper (filtered by month)
  const monthSales = await xata.db.Sales.filter({
    "shopper.id": id,
    sale_date: {
      $ge: monthStart,
      $le: monthEnd,
    },
  })
    .select([
      "id",
      "sale_date",
      "buyer.id",
      "buyer.name",
      "sale_amount_inc_vat",
      "gross_margin",
      "commissionable_margin",
      "commission_locked",
      "commission_paid",
      "invoice_status",
    ])
    .getAll();

  // Fetch YTD sales for this shopper
  const ytdSales = await xata.db.Sales.filter({
    "shopper.id": id,
    sale_date: {
      $ge: ytdStart,
      $le: monthEnd,
    },
  })
    .select([
      "sale_amount_inc_vat",
      "gross_margin",
      "commissionable_margin",
      "commission_locked",
      "commission_paid",
    ])
    .getAll();

  // Calculate metrics
  const thisMonthMetrics = {
    sales: monthSales.length,
    revenue: monthSales.reduce(
      (sum, s) => sum + (s.sale_amount_inc_vat || 0),
      0
    ),
    margin: monthSales.reduce((sum, s) => sum + (s.gross_margin || 0), 0),
    commissionPending: monthSales
      .filter((s) => !s.commission_locked && !s.commission_paid)
      .reduce((sum, s) => sum + (s.commissionable_margin || 0), 0),
    commissionLocked: monthSales
      .filter((s) => s.commission_locked && !s.commission_paid)
      .reduce((sum, s) => sum + (s.commissionable_margin || 0), 0),
    commissionPaid: monthSales
      .filter((s) => s.commission_paid)
      .reduce((sum, s) => sum + (s.commissionable_margin || 0), 0),
  };

  const ytdMetrics = {
    sales: ytdSales.length,
    revenue: ytdSales.reduce((sum, s) => sum + (s.sale_amount_inc_vat || 0), 0),
    margin: ytdSales.reduce((sum, s) => sum + (s.gross_margin || 0), 0),
    commissionPending: ytdSales
      .filter((s) => !s.commission_locked && !s.commission_paid)
      .reduce((sum, s) => sum + (s.commissionable_margin || 0), 0),
    commissionLocked: ytdSales
      .filter((s) => s.commission_locked && !s.commission_paid)
      .reduce((sum, s) => sum + (s.commissionable_margin || 0), 0),
    commissionPaid: ytdSales
      .filter((s) => s.commission_paid)
      .reduce((sum, s) => sum + (s.commissionable_margin || 0), 0),
  };

  // Sort sales by date (most recent first)
  const sortedSales = monthSales.sort((a, b) => {
    const dateA = a.sale_date ? new Date(a.sale_date).getTime() : 0;
    const dateB = b.sale_date ? new Date(b.sale_date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/shoppers"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Shoppers
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {shopper.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  {shopper.email}
                </div>
                <div className="flex items-center gap-2">
                  <Award size={16} />
                  Commission: {shopper.commission_scheme || "standard"}
                </div>
              </div>
            </div>
            <div>
              {shopper.active ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Viewing Period:
            </label>
            <select
              value={currentMonth}
              onChange={(e) => {
                const month = parseInt(e.target.value);
                window.location.href = `/shoppers/${id}?month=${month}&year=${currentYear}`;
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(currentYear, i).toLocaleDateString("en-GB", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => {
                const year = parseInt(e.target.value);
                window.location.href = `/shoppers/${id}?month=${currentMonth}&year=${year}`;
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {Array.from({ length: 3 }, (_, i) => {
                const year = now.getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">
                This Month Sales
              </div>
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(thisMonthMetrics.revenue)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {thisMonthMetrics.sales} trades
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">
                This Month Margin
              </div>
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(thisMonthMetrics.margin)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {thisMonthMetrics.revenue > 0
                ? `${((thisMonthMetrics.margin / thisMonthMetrics.revenue) * 100).toFixed(1)}% margin`
                : "0% margin"}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">YTD Sales</div>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(ytdMetrics.revenue)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {ytdMetrics.sales} trades
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">
                YTD Margin
              </div>
              <DollarSign className="text-orange-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(ytdMetrics.margin)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {ytdMetrics.revenue > 0
                ? `${((ytdMetrics.margin / ytdMetrics.revenue) * 100).toFixed(1)}% margin`
                : "0% margin"}
            </div>
          </div>
        </div>

        {/* Commission Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Commission Breakdown (YTD)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">
                Pending
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(ytdMetrics.commissionPending)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Not yet locked or paid
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">
                Locked
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(ytdMetrics.commissionLocked)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Locked but unpaid
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Paid</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(ytdMetrics.commissionPaid)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Commission paid out
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Sales for{" "}
              {new Date(currentYear, currentMonth).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <p className="text-lg font-medium">No sales found</p>
                      <p className="text-sm mt-1">
                        No sales for this period
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedSales.map((sale) => {
                    const commissionStatus = sale.commission_paid
                      ? "Paid"
                      : sale.commission_locked
                        ? "Locked"
                        : "Pending";

                    return (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sale.sale_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/clients/${sale.buyer?.id}`}
                            className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                          >
                            {sale.buyer?.name || "Unknown"}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatCurrency(sale.sale_amount_inc_vat)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(sale.gross_margin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                          {formatCurrency(sale.commissionable_margin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              commissionStatus === "Paid"
                                ? "bg-green-100 text-green-800"
                                : commissionStatus === "Locked"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {commissionStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
