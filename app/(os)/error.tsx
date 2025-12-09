/**
 * Club 19 Sales OS - Main App Error Boundary
 *
 * Catches errors in the main OS routes and displays user-friendly message
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
    console.error("[OS Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <ErrorDisplay
        message="Something went wrong"
        description="An unexpected error occurred while loading this page. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
