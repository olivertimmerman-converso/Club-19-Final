/**
 * Club 19 Sales OS - Finance Overdue Sales
 *
 * Overdue management console with filters and severity indicators
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuthenticityBadge } from "@/components/ui/AuthenticityBadge";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { SaleDetailModal } from "@/components/modals/SaleDetailModal";
import { getSalesSummary } from "@/lib/api/sales";
import type { SaleSummary } from "@/lib/api/sales";
import { Search, AlertCircle } from "lucide-react";

export default function FinanceOverduePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleSummary | null>(null);

  // Filter states - initialize from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [authenticityRiskFilter, setAuthenticityRiskFilter] = useState<string>(searchParams.get("auth") || "all");
  const [overdueSeverityFilter, setOverdueSeverityFilter] = useState<string>(searchParams.get("severity") || "all");

  // Update URL when filters change
  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all" || value.trim() === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`?${params.toString()}`);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const summaryData = await getSalesSummary();
      // Filter to only overdue sales
      const overdueSales = summaryData.sales.filter((sale) => sale.is_overdue);
      setSales(overdueSales);
    } catch (err: any) {
      setError(err.message || "Failed to load overdue sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Client-side filtering
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Search filter (buyer, supplier, sale ref)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesBuyer = sale.buyer_name.toLowerCase().includes(query);
        const matchesSupplier = sale.supplier_name.toLowerCase().includes(query);
        const matchesRef = sale.sale_reference.toLowerCase().includes(query);
        if (!matchesBuyer && !matchesSupplier && !matchesRef) return false;
      }

      // Authenticity risk filter
      if (authenticityRiskFilter !== "all" && sale.authenticity_risk !== authenticityRiskFilter) {
        return false;
      }

      // Overdue severity filter
      if (overdueSeverityFilter !== "all") {
        const days = sale.days_overdue;
        if (overdueSeverityFilter === "1-7" && (days < 1 || days > 7)) return false;
        if (overdueSeverityFilter === "7-30" && (days < 7 || days > 30)) return false;
        if (overdueSeverityFilter === "30+" && days < 30) return false;
      }

      return true;
    });
  }, [sales, searchQuery, authenticityRiskFilter, overdueSeverityFilter]);

  // Sort by days overdue descending
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => b.days_overdue - a.days_overdue);
  }, [filteredSales]);

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

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Overdue Sales"
          subtitle="Track and manage overdue invoices"
        />
        <PageSection>
          <LoadingBlock message="Loading overdue sales..." />
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Overdue Sales"
          subtitle="Track and manage overdue invoices"
        />
        <PageSection>
          <ErrorBlock message={error} onRetry={fetchData} />
        </PageSection>
      </div>
    );
  }

  return (
    <div>
      <TopLoadingBar isLoading={loading} />
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/staff/finance/dashboard" },
          { label: "Overdue Sales" },
        ]}
      />
      <PageHeader
        title="Overdue Sales"
        subtitle={`${sales.length} total overdue • ${filteredSales.length} shown`}
      />

      {/* Filters */}
      <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search buyer, supplier, or ref..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                updateFilters("search", e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F3DFA2] focus:border-transparent"
            />
          </div>

          {/* Authenticity Risk Filter */}
          <select
            value={authenticityRiskFilter}
            onChange={(e) => {
              setAuthenticityRiskFilter(e.target.value);
              updateFilters("auth", e.target.value);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F3DFA2] focus:border-transparent"
          >
            <option value="all">All Authenticity Risks</option>
            <option value="clean">Clean</option>
            <option value="missing_receipt">Missing Receipt</option>
            <option value="not_verified">Not Verified</option>
            <option value="high_risk">High Risk</option>
          </select>

          {/* Overdue Severity Filter */}
          <select
            value={overdueSeverityFilter}
            onChange={(e) => {
              setOverdueSeverityFilter(e.target.value);
              updateFilters("severity", e.target.value);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F3DFA2] focus:border-transparent"
          >
            <option value="all">All Overdue Periods</option>
            <option value="1-7">1-7 days overdue</option>
            <option value="7-30">7-30 days overdue</option>
            <option value="30+">30+ days overdue</option>
          </select>
        </div>
        <div className="mt-4 text-right">
          <button
            onClick={() => {
              router.push(window.location.pathname);
              setSearchQuery("");
              setAuthenticityRiskFilter("all");
              setOverdueSeverityFilter("all");
            }}
            className="text-sm text-gray-600 hover:text-black underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Overdue Sales Table */}
      <PageSection>
        {sortedSales.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {sales.length === 0
                ? "No overdue sales. Great job!"
                : "No sales match your filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto relative shadow-sm rounded-xl border border-gray-200 bg-white table-scroll-shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Sale Ref
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Buyer
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Amount (Inc VAT)
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Margin %
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Commission
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Due Date
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Days Overdue
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Authenticity
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Errors
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSales.map((sale, idx) => {
                  const hasErrors = sale.errors.length > 0 || sale.warnings.length > 0;
                  const errorCount = sale.errors.length + sale.warnings.length;
                  const isHighlyOverdue = sale.days_overdue > 30;

                  return (
                    <tr
                      key={sale.sale_id}
                      onClick={() => setSelectedSale(sale)}
                      className={`even:bg-gray-50 hover:bg-[#F3DFA2]/10 cursor-pointer transition-colors duration-200 ${
                        isHighlyOverdue ? "border-l-4 border-l-red-500" : ""
                      }`}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{sale.sale_reference}</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{sale.buyer_name}</span>
                          <span className="text-xs text-gray-500">
                            Supplier: {sale.supplier_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <StatusBadge
                          status={
                            sale.status as
                              | "draft"
                              | "invoiced"
                              | "paid"
                              | "locked"
                              | "commission_paid"
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(sale.sale_amount_inc_vat)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            sale.margin_percent > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatPercent(sale.margin_percent)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="font-medium text-[#F3DFA2]">
                          {formatCurrency(sale.commission_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {formatDate(sale.invoice_due_date)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            sale.days_overdue > 30
                              ? "bg-red-100 text-red-700"
                              : sale.days_overdue > 7
                              ? "bg-orange-100 text-orange-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {sale.days_overdue} days
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <AuthenticityBadge
                          authenticity_status={sale.authenticity_status}
                          authenticity_risk={
                            sale.authenticity_risk as
                              | "clean"
                              | "missing_receipt"
                              | "not_verified"
                              | "high_risk"
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        {hasErrors ? (
                          <div className="flex items-center justify-center gap-1">
                            <AlertCircle size={16} className="text-red-600" />
                            <span className="text-sm font-medium text-red-600">
                              {errorCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}
