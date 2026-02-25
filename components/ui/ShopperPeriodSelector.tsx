"use client";

import { useRouter } from "next/navigation";

interface ShopperPeriodSelectorProps {
  shopperId: string;
  currentMonth: number;
  currentYear: number;
}

export function ShopperPeriodSelector({
  shopperId,
  currentMonth,
  currentYear,
}: ShopperPeriodSelectorProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">
          Viewing Period:
        </label>
        <select
          defaultValue={currentMonth}
          onChange={(e) => {
            const month = parseInt(e.target.value);
            router.push(`/shoppers/${shopperId}?month=${month}&year=${currentYear}`);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {new Date(currentYear, i).toLocaleDateString("en-GB", {
                month: "long",
              })}
            </option>
          ))}
        </select>
        <select
          defaultValue={currentYear}
          onChange={(e) => {
            const year = parseInt(e.target.value);
            router.push(`/shoppers/${shopperId}?month=${currentMonth}&year=${year}`);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {Array.from({ length: 3 }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return (
              <option key={year} value={year}>
                {year}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
