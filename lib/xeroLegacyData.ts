/**
 * Club 19 Sales OS - Xero Legacy Data Utilities
 *
 * Helper functions for analyzing xero_import Sales records
 *
 * MIGRATION STATUS: Converted from Xata SDK to Drizzle ORM (Feb 2026)
 */

// ORIGINAL XATA:
// import { getXataClient } from "@/src/xata";

// DRIZZLE IMPORTS
import { db } from "@/db";
import { sales, buyers } from "@/db/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";

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
  // ORIGINAL XATA:
  // const xata = getXataClient();
  // const records = await xata.db.Sales
  //   .filter({
  //     $all: [
  //       { source: 'xero_import' },
  //       { deleted_at: { $is: null } }
  //     ]
  //   })
  //   .select(["sale_amount_inc_vat", "invoice_status", "buyer.name"])
  //   .getAll();

  // DRIZZLE:
  const records = await db
    .select({
      saleAmountIncVat: sales.saleAmountIncVat,
      invoiceStatus: sales.invoiceStatus,
      buyerId: sales.buyerId,
    })
    .from(sales)
    .where(
      and(
        eq(sales.source, 'xero_import'),
        isNull(sales.deletedAt)
      )
    );

  // Get buyer names in a separate query for the unique count
  const buyerIds = [...new Set(records.map(r => r.buyerId).filter(Boolean))] as string[];
  let buyerMap = new Map<string, string>();

  if (buyerIds.length > 0) {
    const buyerRecords = await db
      .select({ id: buyers.id, name: buyers.name })
      .from(buyers);
    buyerRecords.forEach(b => {
      if (b.name) buyerMap.set(b.id, b.name);
    });
  }

  const totalRecords = records.length;
  const totalSales = records.reduce((sum, r) => sum + (r.saleAmountIncVat || 0), 0);
  const totalPaid = records
    .filter(r => r.invoiceStatus === 'PAID')
    .reduce((sum, r) => sum + (r.saleAmountIncVat || 0), 0);
  const totalOutstanding = totalSales - totalPaid;

  const uniqueClientsSet = new Set(
    records
      .map(r => r.buyerId ? buyerMap.get(r.buyerId) : undefined)
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
  // ORIGINAL XATA:
  // const xata = getXataClient();
  // const records = await xata.db.Sales
  //   .filter({
  //     $all: [
  //       { source: 'xero_import' },
  //       { deleted_at: { $is: null } },
  //       { sale_date: { $isNot: null } }
  //     ]
  //   })
  //   .select(["sale_date", "sale_amount_inc_vat", "invoice_status"])
  //   .getAll();

  // DRIZZLE:
  const records = await db
    .select({
      saleDate: sales.saleDate,
      saleAmountIncVat: sales.saleAmountIncVat,
      invoiceStatus: sales.invoiceStatus,
    })
    .from(sales)
    .where(
      and(
        eq(sales.source, 'xero_import'),
        isNull(sales.deletedAt),
        isNotNull(sales.saleDate)
      )
    );

  // Group by month
  const monthlyMap = new Map<string, {
    invoiceCount: number;
    totalValue: number;
    paidValue: number;
  }>();

  for (const record of records) {
    if (!record.saleDate) continue;

    const date = new Date(record.saleDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = monthlyMap.get(monthKey) || {
      invoiceCount: 0,
      totalValue: 0,
      paidValue: 0,
    };

    existing.invoiceCount++;
    existing.totalValue += record.saleAmountIncVat || 0;
    if (record.invoiceStatus === 'PAID') {
      existing.paidValue += record.saleAmountIncVat || 0;
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
  // ORIGINAL XATA:
  // const xata = getXataClient();
  // const records = await xata.db.Sales
  //   .filter({
  //     $all: [
  //       { source: 'xero_import' },
  //       { deleted_at: { $is: null } }
  //     ]
  //   })
  //   .select(["sale_amount_inc_vat", "buyer.name"])
  //   .getAll();

  // DRIZZLE:
  const records = await db
    .select({
      saleAmountIncVat: sales.saleAmountIncVat,
      buyerId: sales.buyerId,
    })
    .from(sales)
    .where(
      and(
        eq(sales.source, 'xero_import'),
        isNull(sales.deletedAt)
      )
    );

  // Get buyer names
  const buyerIds = [...new Set(records.map(r => r.buyerId).filter(Boolean))] as string[];
  let buyerMap = new Map<string, string>();

  if (buyerIds.length > 0) {
    const buyerRecords = await db
      .select({ id: buyers.id, name: buyers.name })
      .from(buyers);
    buyerRecords.forEach(b => {
      if (b.name) buyerMap.set(b.id, b.name);
    });
  }

  // Group by client
  const clientMap = new Map<string, { tradeCount: number; totalSales: number }>();

  for (const record of records) {
    const clientName = record.buyerId ? (buyerMap.get(record.buyerId) || 'Unknown') : 'Unknown';

    const existing = clientMap.get(clientName) || { tradeCount: 0, totalSales: 0 };
    existing.tradeCount++;
    existing.totalSales += record.saleAmountIncVat || 0;

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
  // ORIGINAL XATA:
  // const xata = getXataClient();
  // const records = await xata.db.Sales
  //   .filter({
  //     $all: [
  //       { source: 'xero_import' },
  //       { deleted_at: { $is: null } }
  //     ]
  //   })
  //   .select(["invoice_status", "sale_amount_inc_vat"])
  //   .getAll();

  // DRIZZLE:
  const records = await db
    .select({
      invoiceStatus: sales.invoiceStatus,
      saleAmountIncVat: sales.saleAmountIncVat,
    })
    .from(sales)
    .where(
      and(
        eq(sales.source, 'xero_import'),
        isNull(sales.deletedAt)
      )
    );

  // Group by status
  const statusMap = new Map<string, { count: number; value: number }>();

  for (const record of records) {
    const status = record.invoiceStatus || 'UNKNOWN';

    const existing = statusMap.get(status) || { count: 0, value: 0 };
    existing.count++;
    existing.value += record.saleAmountIncVat || 0;

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
  // ORIGINAL XATA:
  // const xata = getXataClient();
  // const records = await xata.db.Sales
  //   .filter({
  //     $all: [
  //       { source: 'xero_import' },
  //       { deleted_at: { $is: null } }
  //     ]
  //   })
  //   .select(["*", "buyer.name"])
  //   .sort('sale_date', 'desc')
  //   .getPaginated({ pagination: { size: limit } });

  // DRIZZLE:
  const records = await db
    .select({
      id: sales.id,
      saleDate: sales.saleDate,
      xeroInvoiceNumber: sales.xeroInvoiceNumber,
      buyerId: sales.buyerId,
      saleAmountIncVat: sales.saleAmountIncVat,
      invoiceStatus: sales.invoiceStatus,
      itemTitle: sales.itemTitle,
    })
    .from(sales)
    .where(
      and(
        eq(sales.source, 'xero_import'),
        isNull(sales.deletedAt)
      )
    )
    .orderBy(desc(sales.saleDate))
    .limit(limit);

  // Get buyer names
  const buyerIds = [...new Set(records.map(r => r.buyerId).filter(Boolean))] as string[];
  let buyerMap = new Map<string, string>();

  if (buyerIds.length > 0) {
    const buyerRecords = await db
      .select({ id: buyers.id, name: buyers.name })
      .from(buyers);
    buyerRecords.forEach(b => {
      if (b.name) buyerMap.set(b.id, b.name);
    });
  }

  return records.map(r => ({
    id: r.id,
    date: r.saleDate ?? null,
    invoiceNumber: r.xeroInvoiceNumber ?? null,
    clientName: r.buyerId ? (buyerMap.get(r.buyerId) || 'Unknown') : 'Unknown',
    amount: r.saleAmountIncVat || 0,
    status: r.invoiceStatus ?? null,
    itemTitle: r.itemTitle ?? null,
  }));
}
