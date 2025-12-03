/**
 * Club 19 Sales OS - Layout Wrapper
 *
 * Wraps OS routes with sidebar navigation
 */

import { getUserRole } from "@/lib/getUserRole";
import { Sidebar } from "./Sidebar";
import { UserButton } from "@clerk/nextjs";

interface OSLayoutProps {
  children: React.ReactNode;
}

export async function OSLayout({ children }: OSLayoutProps) {
  const role = await getUserRole();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar role={role} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex-1">
            {/* Page-specific content can go here */}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
