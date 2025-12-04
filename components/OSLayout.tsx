/**
 * Club 19 Sales OS - Layout Wrapper
 *
 * Server Component with client boundary for Clerk UI
 * NEVER crashes - graceful error handling
 */

import { getUserRole } from "@/lib/getUserRole";
import { Sidebar } from "./Sidebar";
import { OSNav } from "./OSNav";
import { ErrorFallback } from "./ErrorFallback";

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

    // Render error fallback (client component with button)
    return <ErrorFallback />;
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
