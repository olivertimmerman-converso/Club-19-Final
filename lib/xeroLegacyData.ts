/**
 * Club 19 Sales OS - Xero Legacy Data Utilities
 *
 * Helper functions for analyzing xero_import Sales records
 */

import { getXataClient } from "@/src/xata";

export interface XeroSummary {
  totalRecords: number;
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  uniqueClients: number;
}

export interface MonthlyXeroSales {
  month: string; // "YYYY-MM"
  monthLabel: string; // "Jan 2024"
  invoiceCount: number;
  totalValue: number;
  paidValue: number;
  outstandingValue: number;
}

export interface XeroClientData {
  clientName: string;
  tradeCount: number;
  totalSales: number;
}

export interface InvoiceStatusData {
  status: string;
  count: number;
  value: number;
  [key: string]: string | number;  // Index signature for Recharts compatibility
}

export interface RecentXeroInvoice {
  id: string;
  date: Date | null;
  invoiceNumber: string | null;
  clientName: string;
  amount: number;
  status: string | null;
  itemTitle: string | null;
}

/**
 * Get summary statistics for xero_import records
 */
export async function getXeroSummary(): Promise<XeroSummary> {
  const xata = getXataClient();

  const records = await xata.db.Sales
    .filter({
      $all: [
        { source: 'xero_import' },
        { deleted_at: { $is: null } }
      ]
    })
    .select(["sale_amount_inc_vat", "invoice_status", "buyer.name"])
    .getAll();

  const totalRecords = records.length;
  const totalSales = records.reduce((sum, r) => sum + (r.sale_amount_inc_vat || 0), 0);
  const totalPaid = records
    .filter(r => r.invoice_status === 'PAID')
    .reduce((sum, r) => sum + (r.sale_amount_inc_vat || 0), 0);
  const totalOutstanding = totalSales - totalPaid;

  const uniqueClientsSet = new Set(
    records
      .map(r => r.buyer?.name)
      .filter((name): name is string => !!name)
  );
  const uniqueClients = uniqueClientsSet.size;

  return {
    totalRecords,
    totalSales,
    totalPaid,
    totalOutstanding,
    uniqueClients,
  };
}

/**
 * Get monthly sales breakdown
 */
export async function getXeroMonthlySales(): Promise<MonthlyXeroSales[]> {
  const xata = getXataClient();

  const records = await xata.db.Sales
    .filter({
      $all: [
        { source: 'xero_import' },
        { deleted_at: { $is: null } },
        { sale_date: { $isNot: null } }
      ]
    })
    .select(["sale_date", "sale_amount_inc_vat", "invoice_status"])
    .getAll();

  // Group by month
  const monthlyMap = new Map<string, {
    invoiceCount: number;
    totalValue: number;
    paidValue: number;
  }>();

  for (const record of records) {
    if (!record.sale_date) continue;

    const date = new Date(record.sale_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = monthlyMap.get(monthKey) || {
      invoiceCount: 0,
      totalValue: 0,
      paidValue: 0,
    };

    existing.invoiceCount++;
    existing.totalValue += record.sale_amount_inc_vat || 0;
    if (record.invoice_status === 'PAID') {
      existing.paidValue += record.sale_amount_inc_vat || 0;
    }

    monthlyMap.set(monthKey, existing);
  }

  // Convert to array and sort
  const result: MonthlyXeroSales[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthLabel = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      return {
        month,
        monthLabel,
        invoiceCount: data.invoiceCount,
        totalValue: data.totalValue,
        paidValue: data.paidValue,
        outstandingValue: data.totalValue - data.paidValue,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  return result;
}

/**
 * Get top clients by sales value
 */
export async function getTopXeroClients(limit = 10): Promise<XeroClientData[]> {
  const xata = getXataClient();

  const records = await xata.db.Sales
    .filter({
      $all: [
        { source: 'xero_import' },
        { deleted_at: { $is: null } }
      ]
    })
    .select(["sale_amount_inc_vat", "buyer.name"])
    .getAll();

  // Group by client
  const clientMap = new Map<string, { tradeCount: number; totalSales: number }>();

  for (const record of records) {
    const clientName = record.buyer?.name || 'Unknown';

    const existing = clientMap.get(clientName) || { tradeCount: 0, totalSales: 0 };
    existing.tradeCount++;
    existing.totalSales += record.sale_amount_inc_vat || 0;

    clientMap.set(clientName, existing);
  }

  // Convert to array and sort
  const result: XeroClientData[] = Array.from(clientMap.entries())
    .map(([clientName, data]) => ({
      clientName,
      tradeCount: data.tradeCount,
      totalSales: data.totalSales,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, limit);

  return result;
}

/**
 * Get invoice status breakdown
 */
export async function getInvoiceStatusBreakdown(): Promise<InvoiceStatusData[]> {
  const xata = getXataClient();

  const records = await xata.db.Sales
    .filter({
      $all: [
        { source: 'xero_import' },
        { deleted_at: { $is: null } }
      ]
    })
    .select(["invoice_status", "sale_amount_inc_vat"])
    .getAll();

  // Group by status
  const statusMap = new Map<string, { count: number; value: number }>();

  for (const record of records) {
    const status = record.invoice_status || 'UNKNOWN';

    const existing = statusMap.get(status) || { count: 0, value: 0 };
    existing.count++;
    existing.value += record.sale_amount_inc_vat || 0;

    statusMap.set(status, existing);
  }

  // Convert to array and sort
  const result: InvoiceStatusData[] = Array.from(statusMap.entries())
    .map(([status, data]) => ({
      status,
      count: data.count,
      value: data.value,
    }))
    .sort((a, b) => b.value - a.value);

  return result;
}

/**
 * Get recent invoices
 */
export async function getRecentXeroInvoices(limit = 20): Promise<RecentXeroInvoice[]> {
  const xata = getXataClient();

  const records = await xata.db.Sales
    .filter({
      $all: [
        { source: 'xero_import' },
        { deleted_at: { $is: null } }
      ]
    })
    .select(["*", "buyer.name"])
    .sort('sale_date', 'desc')
    .getPaginated({ pagination: { size: limit } });

  return records.records.map(r => ({
    id: r.id,
    date: r.sale_date ?? null,
    invoiceNumber: r.xero_invoice_number ?? null,
    clientName: r.buyer?.name || 'Unknown',
    amount: r.sale_amount_inc_vat || 0,
    status: r.invoice_status ?? null,
    itemTitle: r.item_title ?? null,
  }));
}
