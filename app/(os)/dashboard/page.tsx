/**
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
import { FounderDashboard } from "@/components/dashboards/FounderDashboard";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ month?: string; viewAs?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const role = await getUserRole();
  const params = await searchParams;
  const monthParam = params.month || "current";
  const viewAs = params.viewAs;

  // Superadmin view switching: Allow superadmin to preview other role experiences
  if (role === "superadmin" && viewAs) {
    switch (viewAs) {
      case "founder":
        return <FounderDashboard monthParam={monthParam} />;
      case "shopper-hope":
        return <ShopperDashboard monthParam={monthParam} shopperNameOverride="Hope" />;
      case "shopper-mc":
        return <ShopperDashboard monthParam={monthParam} shopperNameOverride="MC" />;
      case "superadmin":
        // Fall through to default superadmin view
        break;
    }
  }

  // Render role-specific dashboard based on actual user role
  switch (role) {
    case "shopper":
      return <ShopperDashboard monthParam={monthParam} />;
    case "admin":
      return <AdminDashboard monthParam={monthParam} />;
    case "finance":
      return <FinanceDashboard monthParam={monthParam} />;
    case "founder":
      return <FounderDashboard monthParam={monthParam} />;
    case "superadmin":
      return <SuperadminDashboard monthParam={monthParam} />;
    default:
      return <ShopperDashboard monthParam={monthParam} />;
  }
}
