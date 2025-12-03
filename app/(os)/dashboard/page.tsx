/**
export const dynamic = "force-dynamic";

 * Club 19 Sales OS - Universal Dashboard
 *
 * Role-based dashboard entrypoint
 * Server-side rendering with dynamic content per role
 */

import { getUserRole } from "@/lib/getUserRole";
import { ShopperDashboard } from "@/components/dashboards/ShopperDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { FinanceDashboard } from "@/components/dashboards/FinanceDashboard";
import { SuperadminDashboard } from "@/components/dashboards/SuperadminDashboard";

export default async function DashboardPage() {
  const role = await getUserRole();

  // Render role-specific dashboard
  switch (role) {
    case "shopper":
      return <ShopperDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "finance":
      return <FinanceDashboard />;
    case "superadmin":
      return <SuperadminDashboard />;
    default:
      return <ShopperDashboard />;
  }
}
