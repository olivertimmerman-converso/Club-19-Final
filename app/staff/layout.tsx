/**
 * Club 19 Sales OS - Staff App Layout
 *
 * Layout for all staff-facing pages
 * Applies StaffShell to all routes under staff group
 */

import { StaffShell } from "@/components/layout/StaffShell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
