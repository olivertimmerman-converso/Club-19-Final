/**
 * Club 19 Sales OS - Error Display Component
 *
 * User-friendly error display with optional retry functionality
 */

"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  /**
   * User-friendly error message
   */
  message: string;

  /**
   * Optional detailed error description
   */
  description?: string;

  /**
   * Optional retry callback
   */
  onRetry?: () => void;

  /**
   * Show retry button even without callback (for page refresh)
   */
  showRefresh?: boolean;

  /**
   * Smaller, inline variant
   */
  variant?: "default" | "inline";
}

export function ErrorDisplay({
  message,
  description,
  onRetry,
  showRefresh = false,
  variant = "default",
}: ErrorDisplayProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (showRefresh) {
      window.location.reload();
    }
  };

  const showRetryButton = onRetry || showRefresh;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <span className="text-red-800">{message}</span>
        {showRetryButton && (
          <button
            onClick={handleRetry}
            className="ml-auto text-red-600 hover:text-red-800 underline whitespace-nowrap"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-sm p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        {/* Message */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {message}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 text-center mb-6">
            {description}
          </p>
        )}

        {/* Retry Button */}
        {showRetryButton && (
          <div className="flex justify-center">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple error text for smaller spaces
 */
export function ErrorText({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
