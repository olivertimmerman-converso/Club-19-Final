"use client";

import React, { useState, useEffect } from "react";
import { useTrade } from "@/contexts/TradeContext";
import { BRANDS, CATEGORIES } from "@/lib/constants";

export function StepItemDetails() {
  const { state, setCurrentItem } = useTrade();

  // Initialize from context if available
  const [brand, setBrand] = useState(state.currentItem?.brand || "");
  const [brandOther, setBrandOther] = useState("");
  const [category, setCategory] = useState(state.currentItem?.category || "");
  const [categoryOther, setCategoryOther] = useState("");
  const [description, setDescription] = useState(state.currentItem?.description || "");
  const [quantity, setQuantity] = useState(state.currentItem?.quantity || 1);

  // Show "Other" input fields
  const showBrandOther = brand === "Other";
  const showCategoryOther = category === "Other";

  // Sync to context whenever values change
  useEffect(() => {
    const finalBrand = showBrandOther ? brandOther : brand;
    const finalCategory = showCategoryOther ? categoryOther : category;

    if (finalBrand && finalCategory && description && quantity > 0) {
      setCurrentItem({
        brand: finalBrand,
        category: finalCategory,
        description,
        quantity,
        buyPrice: state.currentItem?.buyPrice,
        sellPrice: state.currentItem?.sellPrice,
      });
    } else if (finalBrand || finalCategory || description) {
      // Partial data - store what we have
      setCurrentItem({
        brand: finalBrand,
        category: finalCategory,
        description,
        quantity,
        buyPrice: state.currentItem?.buyPrice,
        sellPrice: state.currentItem?.sellPrice,
      });
    }
  }, [brand, brandOther, category, categoryOther, description, quantity, showBrandOther, showCategoryOther, setCurrentItem, state.currentItem?.buyPrice, state.currentItem?.sellPrice]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Item Details
        </h2>
        <p className="text-sm text-gray-600">
          Tell us about the item you&apos;re sourcing
        </p>
      </div>

      {/* Item Details Card */}
      <div className="border-t-4 border-blue-600 bg-blue-50 p-4 rounded-lg space-y-4">
        <h3 className="font-semibold text-gray-900">What is the item?</h3>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand <span className="text-red-600">*</span>
          </label>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              if (e.target.value !== "Other") {
                setBrandOther("");
              }
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select brand...</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Other Input */}
        {showBrandOther && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specify brand <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={brandOther}
              onChange={(e) => setBrandOther(e.target.value)}
              placeholder="Enter brand name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-600">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (e.target.value !== "Other") {
                setCategoryOther("");
              }
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select category...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Category Other Input */}
        {showCategoryOther && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specify category <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={categoryOther}
              onChange={(e) => setCategoryOther(e.target.value)}
              placeholder="Enter category name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g., B25 Black Togo GHW"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            min="1"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>
    </div>
  );
}
