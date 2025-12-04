/**
 * Club 19 Sales OS - Layout Wrapper
 *
 * Server Component with client boundary for Clerk UI
 * NEVER crashes - graceful error handling
 */

import { getUserRole } from "@/lib/getUserRole";
import { Sidebar } from "./Sidebar";
import { OSNav } from "./OSNav";

interface OSLayoutProps {
  children: React.ReactNode;
}

export async function OSLayout({ children }: OSLayoutProps) {
  console.log("[OSLayout] 🏗️  Starting SSR layout render");

  let role;
  let hasError = false;

  try {
    console.log("[OSLayout] 📋 Calling getUserRole()");
    role = await getUserRole();
    console.log(`[OSLayout] ✅ Role resolved: "${role}"`);
  } catch (error) {
    hasError = true;
    console.error("[OSLayout] ❌ Failed to get user role:", error);
    console.error("[OSLayout] 🔄 Rendering error state");

    // Render error fallback
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

  console.log("[OSLayout] 🎨 Rendering layout with role:", role);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Server Component */}
      <Sidebar role={role} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex-1">
            {/* Page-specific content can go here */}
          </div>

          {/* User Profile - Client Component with Clerk */}
          <OSNav role={role} />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
