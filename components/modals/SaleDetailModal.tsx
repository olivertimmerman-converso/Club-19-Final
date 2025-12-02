/**
 * Club 19 Sales OS - Sale Detail Modal
 *
 * Read-only slide-over panel showing comprehensive sale information
 * Keyboard accessible (Esc to close, no API call needed)
 */

"use client";

import { X, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuthenticityBadge } from "@/components/ui/AuthenticityBadge";
import type { SaleSummary } from "@/lib/api/sales";
import { useEffect } from "react";

interface SaleDetailModalProps {
  sale: SaleSummary;
  isOpen: boolean;
  onClose: () => void;
}

export function SaleDetailModal({ sale, isOpen, onClose }: SaleDetailModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  const errorCount = sale.errors.length;
  const warningCount = sale.warnings.length;

  // Lifecycle stages
  const lifecycleStages = [
    { label: "Created", status: "draft", completed: true },
    { label: "Invoiced", status: "invoiced", completed: sale.status !== "draft" },
    { label: "Paid", status: "paid", completed: sale.isPaid },
    { label: "Locked", status: "locked", completed: sale.isLocked },
    {
      label: "Commission Paid",
      status: "commission_paid",
      completed: sale.status === "commission_paid",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#F3DFA2]">
          <div>
            <h2 className="text-xl font-semibold">{sale.sale_reference}</h2>
            <p className="text-sm text-gray-300 mt-1">Sale Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Section - Key Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Overview
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
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
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Buyer</span>
                <span className="font-medium text-gray-900">{sale.buyer_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Supplier</span>
                <span className="font-medium text-gray-900">{sale.supplier_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Buyer Type</span>
                <span className="text-sm text-gray-900 capitalize">
                  {sale.buyer_type.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Shopper</span>
                <span className="font-medium text-gray-900">{sale.shopper_name}</span>
              </div>
              {sale.introducer_name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Introducer</span>
                  <span className="font-medium text-gray-900">{sale.introducer_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Authenticity</span>
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
              </div>
            </div>
          </section>

          {/* Financial Overview */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Financial Breakdown
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sale Amount (inc VAT)</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(sale.sale_amount_inc_vat)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Buy Cost</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(sale.buy_price)}
                </span>
              </div>
              <div className="h-px bg-gray-300" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Commissionable Margin</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(sale.commissionable_margin)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Margin %</span>
                <span
                  className={`font-bold ${
                    sale.margin_percent > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(sale.margin_percent)}
                </span>
              </div>
              <div className="h-px bg-gray-300" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Commission Amount</span>
                <span className="text-lg font-bold text-[#F3DFA2]">
                  {formatCurrency(sale.commission_amount)}
                </span>
              </div>
            </div>
          </section>

          {/* Payment Dates */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Payment Timeline
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Invoice Due Date</span>
                <span className="font-medium text-gray-900">
                  {formatDate(sale.invoice_due_date)}
                </span>
              </div>
              {sale.xero_payment_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Payment Date</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(sale.xero_payment_date)}
                  </span>
                </div>
              )}
              {sale.is_overdue && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {sale.days_overdue} days overdue
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Errors & Warnings */}
          {(errorCount > 0 || warningCount > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Errors & Warnings
              </h3>
              <div className="space-y-2">
                {sale.errors.map((error, idx) => (
                  <div
                    key={`error-${idx}`}
                    className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-900">{error.error_type}</div>
                      <div className="text-xs text-red-700 mt-1">{error.message}</div>
                      {error.severity && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium uppercase">
                          {error.severity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {sale.warnings.map((warning, idx) => (
                  <div
                    key={`warning-${idx}`}
                    className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                  >
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-yellow-900">
                        {warning.error_type}
                      </div>
                      <div className="text-xs text-yellow-700 mt-1">{warning.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lifecycle Timeline */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Lifecycle Timeline
            </h3>
            <div className="space-y-3">
              {lifecycleStages.map((stage, idx) => (
                <div key={stage.status} className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      stage.completed
                        ? "bg-green-100 border-2 border-green-500"
                        : "bg-gray-100 border-2 border-gray-300"
                    }`}
                  >
                    {stage.completed ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <Clock size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${
                        stage.completed ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {stage.label}
                    </div>
                  </div>
                  {stage.completed && sale.status === stage.status && (
                    <span className="text-xs font-medium text-[#F3DFA2] uppercase">Current</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[#0A0A0A] text-white rounded-lg hover:bg-[#0A0A0A]/90 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
