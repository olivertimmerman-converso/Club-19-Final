/**
 * Club 19 Sales OS - Xero Health Dashboard
 *
 * Restricted: Superadmin, Admin, Operations
 * Shows Xero connection status and token health
 */

export const dynamic = "force-dynamic";

import { getUserRole } from "@/lib/getUserRole";
import { canAccessRoute } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { XeroHealthClient } from "./XeroHealthClient";

export default async function XeroHealthPage() {
  const role = await getUserRole();

  // Check if user has access to this page
  if (!canAccessRoute(role, "/xero-health")) {
    redirect("/dashboard");
  }

  return <XeroHealthClient role={role} />;
}
