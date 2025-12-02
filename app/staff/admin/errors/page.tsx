/**
 * Club 19 Sales OS - Admin Error Dashboard
 *
 * Error analytics with groupings by domain, type, and severity
 */

"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { MetricCard } from "@/components/ui/MetricCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { getErrorGroups } from "@/lib/api/errors";
import type { ErrorGroupsSummary } from "@/lib/api/errors";
import { AlertCircle, AlertTriangle, XCircle, Activity } from "lucide-react";

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorGroupsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const errorsData = await getErrorGroups();
      setErrors(errorsData);
    } catch (err: any) {
      setError(err.message || "Failed to load error data");
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
        <PageHeader title="Error Dashboard" subtitle="Monitor and resolve system errors" />
        <PageSection>
          <LoadingBlock message="Loading error analytics..." />
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Error Dashboard" subtitle="Monitor and resolve system errors" />
        <PageSection>
          <ErrorBlock message={error} onRetry={fetchData} />
        </PageSection>
      </div>
    );
  }

  if (!errors) {
    return null;
  }

  // High severity count (assuming severity levels exist)
  const highSeverityCount = errors.errors_by_severity["high"] || 0;

  // Convert objects to arrays for table display
  const errorsByType = Object.entries(errors.errors_by_type).map(([type, count]) => ({
    type,
    count,
  }));

  const errorsByGroup = Object.entries(errors.errors_by_group).map(([group, count]) => ({
    group,
    count,
  }));

  const errorsBySeverity = Object.entries(errors.errors_by_severity).map(([severity, count]) => ({
    severity,
    count,
  }));

  // Sort by count descending
  errorsByType.sort((a, b) => b.count - a.count);
  errorsByGroup.sort((a, b) => b.count - a.count);
  errorsBySeverity.sort((a, b) => b.count - a.count);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-orange-600 bg-orange-50";
      case "low":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div>
      <TopLoadingBar isLoading={loading} />
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/staff/admin/dashboard" },
          { label: "Errors" },
        ]}
      />
      <PageHeader
        title="Error Dashboard"
        subtitle="System-wide error tracking and analytics"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Errors"
          value={errors.total_errors}
          icon={AlertCircle}
          subtitle="across all sales"
        />
        <MetricCard
          title="Unresolved Errors"
          value={errors.unresolved_errors}
          icon={XCircle}
          subtitle="need attention"
        />
        <MetricCard
          title="High Severity"
          value={highSeverityCount}
          icon={AlertTriangle}
          subtitle="critical issues"
        />
        <MetricCard
          title="Error Groups"
          value={errorsByGroup.length}
          icon={Activity}
          subtitle="unique categories"
        />
      </div>

      {/* Errors by Domain (Type) */}
      <PageSection title="Errors by Domain">
        {errorsByType.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No errors found. System is running clean!</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative shadow-sm rounded-xl border border-gray-200 bg-white table-scroll-shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Domain
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Error Count
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {errorsByType.map(({ type, count }) => {
                  const percentage =
                    errors.total_errors > 0
                      ? ((count / errors.total_errors) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <tr key={type} className="even:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-900 capitalize">
                          {type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="font-medium text-gray-900">{count}</span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="text-gray-600">{percentage}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* Errors by Group */}
      <PageSection title="Errors by Group">
        {errorsByGroup.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No error groups found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative shadow-sm rounded-xl border border-gray-200 bg-white table-scroll-shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Error Group
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Occurrences
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {errorsByGroup.map(({ group, count }) => {
                  const percentage =
                    errors.total_errors > 0
                      ? ((count / errors.total_errors) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <tr key={group} className="even:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{group}</span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="font-medium text-gray-900">{count}</span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="text-gray-600">{percentage}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* Errors by Severity */}
      <PageSection title="Errors by Severity">
        {errorsBySeverity.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No severity data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative shadow-sm rounded-xl border border-gray-200 bg-white table-scroll-shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Severity Level
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Count
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {errorsBySeverity.map(({ severity, count }) => {
                  const percentage =
                    errors.total_errors > 0
                      ? ((count / errors.total_errors) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <tr key={severity} className="even:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getSeverityColor(
                            severity
                          )}`}
                        >
                          {severity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="font-medium text-gray-900">{count}</span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="text-gray-600">{percentage}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  );
}
