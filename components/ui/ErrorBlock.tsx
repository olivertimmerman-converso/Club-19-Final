/**
 * Club 19 Sales OS - Error Block Component
 *
 * Error display with retry button
 */

"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBlockProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorBlock({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorBlockProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-red-600" />
      </div>
      <p className="text-gray-900 font-medium mb-2">Error</p>
      <p className="text-gray-600 text-sm text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] text-white rounded-lg hover:bg-[#0A0A0A]/90 transition-colors"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      )}
    </div>
  );
}
