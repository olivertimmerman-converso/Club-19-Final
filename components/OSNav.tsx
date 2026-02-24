/**
 * Club 19 Sales OS - Navigation (Client Component)
 *
 * Client-side navigation with Clerk UserButton
 * Handles Clerk hydration errors gracefully
 */

"use client";

import { UserButton } from "@clerk/nextjs";
import { type StaffRole } from "@/lib/permissions";
import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { SearchOverlay, useSearchShortcut } from "./SearchOverlay";
import * as logger from '@/lib/logger';

interface OSNavProps {
  role: StaffRole;
}

export function OSNav({ role }: OSNavProps) {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useSearchShortcut(useCallback(() => setSearchOpen(true), []));

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
      </div>
    );
  }

  // Show error state if UserButton fails
  if (hasError) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-300 rounded-md">
        <span className="text-sm font-medium text-red-800">⚠️ Auth Error</span>
      </div>
    );
  }

  // Render UserButton with error boundary
  try {
    return (
      <div className="flex items-center gap-4">
        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Search size={14} />
          <span>Search...</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white rounded border border-gray-200">
            ⌘K
          </kbd>
        </button>
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

        <div className="text-sm text-gray-600">
          Role: <span className="font-medium text-gray-900">{role}</span>
        </div>
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "w-10 h-10",
            },
          }}
        />
      </div>
    );
  } catch (error) {
    logger.error('NAV', 'UserButton error', { error: error as any } as any);
    setHasError(true);
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-300 rounded-md">
        <span className="text-sm font-medium text-red-800">⚠️ Auth Error</span>
      </div>
    );
  }
}
