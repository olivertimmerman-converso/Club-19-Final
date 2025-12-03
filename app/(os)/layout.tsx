/**
 * Club 19 Sales OS - OS Routes Layout
 *
 * Layout for all new OS routes (dashboard, sales, clients, etc.)
 * Wraps with sidebar and top bar
 */

import { OSLayout } from "@/components/OSLayout";

export default function OSRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OSLayout>{children}</OSLayout>;
}
