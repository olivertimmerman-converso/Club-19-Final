'use client';

import React from 'react';

/**
 * Error Boundary Component
 *
 * Catches React component errors and displays a fallback UI instead of white screen.
 * Prevents entire app from crashing when a component throws an error.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F3FF] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-red-200 rounded-2xl shadow-lg p-8">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-serif font-bold text-red-900 mb-3 text-center">
              Something went wrong
            </h2>

            {/* Error Message */}
            <p className="text-sm text-red-700 mb-6 text-center leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            {/* Action Button */}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-400 text-white rounded-xl font-medium shadow-md hover:opacity-90 transition-opacity"
            >
              Reload Page
            </button>

            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
