/**
 * Club 19 Sales OS - Legacy Xero Data Dashboard
 *
 * Analytics dashboard for historical xero_import Sales records
 * Restricted: Superadmin, Operations, Admin, Finance
 */

export const dynamic = "force-dynamic";

import { getUserRole } from "@/lib/getUserRole";
import { assertLegacyAccess } from "@/lib/assertAccess";
import {
  getXeroSummary,
  getXeroMonthlySales,
  getTopXeroClients,
  getInvoiceStatusBreakdown,
  getRecentXeroInvoices,
} from "@/lib/xeroLegacyData";
import { XeroSummaryCards } from "@/components/xero-legacy/XeroSummaryCards";
import { XeroSalesChart } from "@/components/xero-legacy/XeroSalesChart";
import { XeroTopClientsTable } from "@/components/xero-legacy/XeroTopClientsTable";
import { XeroStatusChart } from "@/components/xero-legacy/XeroStatusChart";
import { XeroMonthlyTable } from "@/components/xero-legacy/XeroMonthlyTable";
import { XeroRecentInvoicesTable } from "@/components/xero-legacy/XeroRecentInvoicesTable";

export default async function LegacyXeroPage() {
  // Check permissions
  const role = await getUserRole();
  assertLegacyAccess(role);

  // Fetch all analytics data in parallel
  const [summary, monthlySales, topClients, statusBreakdown, recentInvoices] =
    await Promise.all([
      getXeroSummary(),
      getXeroMonthlySales(),
      getTopXeroClients(10),
      getInvoiceStatusBreakdown(),
      getRecentXeroInvoices(20),
    ]);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Legacy Xero Data
        </h1>
        <p className="text-gray-600">
          Analytics dashboard for historical Xero-imported sales records
        </p>
      </div>

      {/* Summary Cards */}
      <XeroSummaryCards summary={summary} />

      {/* Charts Row 1 - Sales Over Time */}
      <XeroSalesChart data={monthlySales} />

      {/* Charts Row 2 - Status and Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <XeroStatusChart data={statusBreakdown} />
        <XeroTopClientsTable data={topClients} />
      </div>

      {/* Monthly Performance Table */}
      <XeroMonthlyTable data={monthlySales} />

      {/* Recent Invoices */}
      <XeroRecentInvoicesTable data={recentInvoices} />
    </div>
  );
}
