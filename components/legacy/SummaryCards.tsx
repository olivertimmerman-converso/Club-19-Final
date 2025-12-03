/**
 * Club 19 Sales OS - Legacy Summary Cards
 *
 * Summary metric cards for legacy dashboards
 */

import { LegacySummary } from "@/lib/legacyData";
import { DollarSign, TrendingUp, Briefcase, Users, Building2 } from "lucide-react";

interface SummaryCardsProps {
  summary: LegacySummary;
  showCounts?: boolean;
}

export function SummaryCards({ summary, showCounts = true }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      title: "Total Sales",
      value: formatCurrency(summary.totalSales),
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Margin",
      value: formatCurrency(summary.totalMargin),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Trades",
      value: summary.tradeCount.toString(),
      icon: Briefcase,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  if (showCounts) {
    cards.push(
      {
        title: "Clients",
        value: summary.clientCount.toString(),
        icon: Users,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      {
        title: "Suppliers",
        value: summary.supplierCount.toString(),
        icon: Building2,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
      }
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
