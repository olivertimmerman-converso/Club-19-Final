"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface SalesFiltersProps {
  shoppers: { id: string; name: string }[];
}

export function SalesFilters({ shoppers }: SalesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentShopper = searchParams.get("shopper") || "all";
  const currentStatus = searchParams.get("status") || "all";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectClassName = `
    appearance-none
    h-10 pl-4 pr-10 py-2 w-full sm:w-auto sm:min-w-[180px]
    bg-white border border-gray-200 rounded-lg
    text-sm font-medium text-gray-700
    hover:bg-gray-50 hover:border-gray-400
    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
    transition-colors cursor-pointer
  `;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Shopper Filter */}
      <div className="relative">
        <select
          value={currentShopper}
          onChange={(e) => updateParam("shopper", e.target.value)}
          className={selectClassName}
        >
          <option value="all">All Shoppers</option>
          {shoppers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
          size={16}
        />
      </div>

      {/* Status Filter */}
      <div className="relative">
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className={selectClassName}
        >
          <option value="all">All Statuses</option>
          <option value="needs-attention">Needs Attention</option>
          <option value="completed">Completed</option>
          <option value="ongoing">Ongoing</option>
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
          size={16}
        />
      </div>
    </div>
  );
}
