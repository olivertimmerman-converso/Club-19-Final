/**
 * Club 19 Sales OS - Staff Portal Error Boundary
 *
 * Catches errors in the staff portal routes
 */

"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("[Staff Portal Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <ErrorDisplay
        message="Staff portal error"
        description="An error occurred while loading the staff portal. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
