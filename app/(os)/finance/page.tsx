import Link from "next/link";
// ORIGINAL XATA: import { XataClient } from "@/src/xata";
import { db } from "@/db";
import { sales, shoppers } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUserRole } from "@/lib/getUserRole";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { getMonthDateRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

/**
 * Club 19 Sales OS - Finance Page
 *
 * Commission tracking and P&L overview
 * Restricted: Admin + Finance + Superadmin
 * Shoppers see only their own commission data (not company P&L)
 */

// ORIGINAL XATA: const xata = new XataClient();

interface FinancePageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  // Get role and user info for filtering
  const role = await getUserRole();
  const currentUser = await getCurrentUser();

  // Get month filter
  const params = await searchParams;
  const monthParam = params.month || "current";
  const dateRange = getMonthDateRange(monthParam);

  // Build conditions for sales query
  const conditions: any[] = [];

  // ORIGINAL XATA:
  // // Fetch sales with financial and commission data
  // let salesQuery = xata.db.Sales
  //   .select([
  //     'id',
  //     'sale_date',
  //     'item_title',
  //     'brand',
  //     'sale_amount_inc_vat',
  //     'buy_price',
  //     'shipping_cost',
  //     'card_fees',
  //     'direct_costs',
  //     'gross_margin',
  //     'commissionable_margin',
  //     'commission_locked',
  //     'commission_paid',
  //     'shopper.name',
  //     'shopper.name',
  //   ]);
  //
  // // Filter for shoppers - only show their own sales
  // if (role === 'shopper' && currentUser?.fullName) {
  //   // Look up the Shopper record by name to get the ID
  //   const shopper = await xata.db.Shoppers.filter({ name: currentUser.fullName }).getFirst();
  //   if (shopper) {
  //     // Filter Sales by the shopper link ID
  //     salesQuery = salesQuery.filter({ shopper: shopper.id });
  //   }
  // }
  //
  // // Apply date range filter if specified
  // if (dateRange) {
  //   salesQuery = salesQuery.filter({
  //     sale_date: {
  //       $ge: dateRange.start,
  //       $le: dateRange.end,
  //     },
  //   });
  // }
  //
  // const sales = await salesQuery.getAll();

  // Filter for shoppers - only show their own sales
  if (role === 'shopper' && currentUser?.fullName) {
    // Look up the Shopper record by name to get the ID
    const shopper = await db.query.shoppers.findFirst({
      where: eq(shoppers.name, currentUser.fullName),
    });
    if (shopper) {
      conditions.push(eq(sales.shopperId, shopper.id));
    }
  }

  // Apply date range filter if specified
  if (dateRange) {
    conditions.push(gte(sales.saleDate, dateRange.start));
    conditions.push(lte(sales.saleDate, dateRange.end));
  }

  // Fetch sales with financial and commission data
  const salesData = await db.query.sales.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      shopper: true,
    },
    limit: 500,
  });

  // Calculate P&L totals
  const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.saleAmountIncVat || 0), 0);
  const totalCosts = salesData.reduce((sum, sale) =>
    sum + (sale.buyPrice || 0) + (sale.shippingCost || 0) +
    (sale.cardFees || 0) + (sale.directCosts || 0), 0
  );
  const totalMargin = salesData.reduce((sum, sale) => sum + (sale.grossMargin || 0), 0);
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  // Commission status breakdown
  const pendingCommission = salesData.filter(sale => !sale.commissionLocked);
  const lockedCommission = salesData.filter(sale => sale.commissionLocked && !sale.commissionPaid);
  const paidCommission = salesData.filter(sale => sale.commissionPaid);

  const pendingCommissionMargin = pendingCommission.reduce((sum, sale) =>
    sum + (sale.commissionableMargin || 0), 0
  );
  const lockedCommissionMargin = lockedCommission.reduce((sum, sale) =>
    sum + (sale.commissionableMargin || 0), 0
  );
  const paidCommissionMargin = paidCommission.reduce((sum, sale) =>
    sum + (sale.commissionableMargin || 0), 0
  );

  // Recent sales pending commission approval (unlocked only)
  const pendingSales = salesData
    .filter(sale => !sale.commissionLocked)
    .sort((a, b) => {
      const dateA = a.saleDate ? new Date(a.saleDate).getTime() : 0;
      const dateB = b.saleDate ? new Date(b.saleDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);

  // Revenue by brand (top 5)
  const brandRevenue: Record<string, { revenue: number; margin: number }> = {};
  salesData.forEach(sale => {
    const brand = sale.brand || 'Unknown';
    if (!brandRevenue[brand]) {
      brandRevenue[brand] = { revenue: 0, margin: 0 };
    }
    brandRevenue[brand].revenue += sale.saleAmountIncVat || 0;
    brandRevenue[brand].margin += sale.grossMargin || 0;
  });

  const topBrands = Object.entries(brandRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Finance</h1>
          <p className="text-gray-600">
            Commission tracking and P&L overview
          </p>
        </div>
        <MonthPicker />
      </div>

      {/* P&L Summary Cards - Hidden from shoppers */}
      {role !== 'shopper' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">All sales inc VAT</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Costs</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCosts)}</p>
            <p className="text-xs text-gray-500 mt-1">Buy + shipping + fees</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Gross Margin</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalMargin)}</p>
            <p className="text-xs text-gray-500 mt-1">Total profit</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Margin %</h3>
            <p className="text-2xl font-bold text-purple-600">{marginPercent.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Average margin rate</p>
          </div>
        </div>
      )}

      {/* Commission Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Commission Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600">{pendingCommission.length}</p>
            <p className="text-sm text-gray-600 mt-1">{formatCurrency(pendingCommissionMargin)}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Locked</h3>
            <p className="text-2xl font-bold text-blue-600">{lockedCommission.length}</p>
            <p className="text-sm text-gray-600 mt-1">{formatCurrency(lockedCommissionMargin)}</p>
            <p className="text-xs text-gray-500 mt-1">Approved, unpaid</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Paid</h3>
            <p className="text-2xl font-bold text-green-600">{paidCommission.length}</p>
            <p className="text-sm text-gray-600 mt-1">{formatCurrency(paidCommissionMargin)}</p>
            <p className="text-xs text-gray-500 mt-1">Commission paid</p>
          </div>
        </div>
      </div>

      {/* Recent Sales for Commission Review */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sales - Pending Commission Approval</h2>
        {pendingSales.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">All commissions approved</h3>
            <p className="mt-1 text-sm text-gray-500">
              No sales pending commission approval.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comm. Margin
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shopper
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          {sale.brand && sale.itemTitle
                            ? `${sale.brand} - ${sale.itemTitle}`
                            : sale.brand || sale.itemTitle || '—'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(sale.saleAmountIncVat || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        {formatCurrency(sale.grossMargin || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                        {formatCurrency(sale.commissionableMargin || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.shopper?.name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                        >
                          Lock Commission
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Revenue by Brand - Hidden from shoppers */}
      {role !== 'shopper' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Brand (Top 5)</h2>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {topBrands.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No sales data available.</p>
            ) : (
              <div className="space-y-4">
                {topBrands.map(([brand, data]) => {
                  const brandMarginPercent = data.revenue > 0 ? (data.margin / data.revenue) * 100 : 0;
                  const brandPercentOfTotal = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;

                  return (
                    <div key={brand}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">{brand}</h4>
                            <span className="text-sm text-gray-500">{brandPercentOfTotal.toFixed(1)}% of total</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                            <span>Revenue: {formatCurrency(data.revenue)}</span>
                            <span>Margin: {formatCurrency(data.margin)} ({brandMarginPercent.toFixed(1)}%)</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${brandPercentOfTotal}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
