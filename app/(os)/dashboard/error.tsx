'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError] Caught error:', error);
  }, [error]);

  return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-red-900 mb-2">Dashboard Error</h1>
        <p className="text-sm text-red-700 mb-4">
          An error occurred while loading the dashboard.
        </p>
        <p className="text-sm font-medium text-red-800 mb-2">
          {error.message}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-500 mb-4">Error ID: {error.digest}</p>
        )}
        <details className="text-xs text-red-600 mb-4">
          <summary className="cursor-pointer font-medium hover:text-red-800">Stack trace</summary>
          <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto text-xs max-h-64">
            {error.stack}
          </pre>
        </details>
        <button
          onClick={reset}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
