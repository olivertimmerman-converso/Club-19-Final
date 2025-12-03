/**
 * Club 19 Sales OS - Recent Trades Table
 *
 * Table showing recent legacy trades
 */

import { LegacyTrade } from "@/lib/legacyData";

interface RecentTradesTableProps {
  data: LegacyTrade[];
}

export function RecentTradesTable({ data }: RecentTradesTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h3>
        <div className="text-center py-8 text-gray-400">No trades found</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sell Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Margin
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {formatDate(trade.trade_date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trade.raw_client || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trade.raw_supplier || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {trade.brand || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                  {trade.item || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {formatCurrency(trade.sell_price)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  {formatCurrency(trade.margin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
