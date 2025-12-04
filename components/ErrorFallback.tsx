/**
 * Club 19 Sales OS - Error Fallback Component
 *
 * Client component for error state UI with interactive button
 */

"use client";

export function ErrorFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md p-6 bg-white rounded-lg shadow-lg border border-red-300">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-lg font-semibold text-gray-900">Authentication Error</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Unable to load your user session. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
