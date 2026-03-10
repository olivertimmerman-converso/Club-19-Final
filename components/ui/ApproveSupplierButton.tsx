"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApproveSupplierButtonProps {
  supplierId: string;
  supplierName: string;
}

export function ApproveSupplierButton({ supplierId, supplierName }: ApproveSupplierButtonProps) {
  const [isApproving, setIsApproving] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve supplier");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to approve supplier:", error);
      alert(`Failed to approve ${supplierName}. Please try again.`);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <button
      onClick={handleApprove}
      disabled={isApproving}
      className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isApproving ? "Approving..." : "Approve"}
    </button>
  );
}
