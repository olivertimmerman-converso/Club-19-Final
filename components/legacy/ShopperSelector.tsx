/**
 * Club 19 Sales OS - Shopper Selector
 *
 * Dropdown to select which shopper's data to view
 * Only shown to non-shopper roles
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ShopperSelectorProps {
  currentShopper: "Hope" | "MC";
}

export function ShopperSelector({ currentShopper }: ShopperSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<"Hope" | "MC">(currentShopper);

  const handleChange = (value: "Hope" | "MC") => {
    setSelected(value);
    router.push(`/legacy/my-sales?shopper=${value}`);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        View Sales For:
      </label>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value as "Hope" | "MC")}
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-black focus:border-black text-sm"
      >
        <option value="Hope">Hope</option>
        <option value="MC">MC</option>
      </select>
    </div>
  );
}
