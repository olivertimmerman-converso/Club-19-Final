/**
 * Club 19 Sales OS - Staff Interface Topbar
 *
 * Top navigation bar with user info, role badge, and sign out
 */

"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useUserRole } from "@/lib/rbac-client";
import { ROLE_CONFIG } from "@/lib/rbac";
import { Menu } from "lucide-react";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useUser();
  const role = useUserRole();
  const roleLabel = role ? ROLE_CONFIG[role]?.label : "Guest";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left: Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Menu size={24} />
      </button>

      {/* Center: Page Title (can be overridden by page content) */}
      <div className="flex-1 lg:ml-0 ml-4">
        {/* This space is reserved for page-specific content */}
      </div>

      {/* Right: User Info */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <div className="hidden sm:block px-3 py-1 rounded-full bg-[#F3DFA2]/10 border border-[#F3DFA2]/30">
          <span className="text-xs font-semibold text-[#0A0A0A]">{roleLabel}</span>
        </div>

        {/* User Name */}
        {user && (
          <div className="hidden md:block text-sm">
            <div className="font-medium text-gray-900">
              {user.firstName || user.emailAddresses[0]?.emailAddress}
            </div>
            <div className="text-xs text-gray-500">{user.emailAddresses[0]?.emailAddress}</div>
          </div>
        )}

        {/* Clerk User Button */}
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
  );
}
