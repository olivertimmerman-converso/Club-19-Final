/**
 * Xero Legacy - Summary Cards Component
 */
"use client";

import { XeroSummary } from "@/lib/xeroLegacyData";

interface Props {
  summary: XeroSummary;
}

export function XeroSummaryCards({ summary }: Props) {
  const formatCurrency = (value: number) =>
    `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-sm font-medium text-gray-600 mb-1">Total Records</div>
        <div className="text-3xl font-bold text-gray-900">{summary.totalRecords}</div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-sm font-medium text-gray-600 mb-1">Total Sales</div>
        <div className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalSales)}</div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-sm font-medium text-gray-600 mb-1">Total Paid</div>
        <div className="text-3xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-sm font-medium text-gray-600 mb-1">Outstanding</div>
        <div className="text-3xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-sm font-medium text-gray-600 mb-1">Unique Clients</div>
        <div className="text-3xl font-bold text-gray-900">{summary.uniqueClients}</div>
      </div>
    </div>
  );
}
