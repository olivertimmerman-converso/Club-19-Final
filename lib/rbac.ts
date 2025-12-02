/**
 * Club 19 Sales OS - Role-Based Access Control
 *
 * Roles:
 * - shopper: Hope, MC (sales team)
 * - admin: Sophie (operations manager)
 * - finance: Alys (finance team)
 * - superadmin: Oliver (full system access)
 */

export type UserRole = 'shopper' | 'admin' | 'finance' | 'superadmin';

export interface RoleConfig {
  allowedRoutes: string[];
  readOnlyRoutes?: string[];
  homepage: string;
  label: string;
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  shopper: {
    allowedRoutes: ['/dashboard', '/deals', '/commissions'],
    homepage: '/dashboard',
    label: 'Shopper',
  },
  admin: {
    allowedRoutes: [
      '/dashboard',
      '/deals',
      '/commissions',
      '/admin/dashboard',
      '/admin/deals',
      '/admin/shoppers',
      '/admin/buyers',
      '/admin/suppliers',
      '/admin/commission',
      '/admin/errors',
      '/admin/month-end',
    ],
    homepage: '/admin/dashboard',
    label: 'Administrator',
  },
  finance: {
    allowedRoutes: [
      '/finance/dashboard',
      '/finance/commissions',
      '/finance/exports',
      '/finance/invoices',
      '/finance/checks',
    ],
    readOnlyRoutes: ['/admin/deals'],
    homepage: '/finance/dashboard',
    label: 'Finance',
  },
  superadmin: {
    allowedRoutes: [
      '/dashboard',
      '/deals',
      '/commissions',
      '/admin/dashboard',
      '/admin/deals',
      '/admin/shoppers',
      '/admin/buyers',
      '/admin/suppliers',
      '/admin/commission',
      '/admin/errors',
      '/admin/month-end',
      '/finance/dashboard',
      '/finance/commissions',
      '/finance/exports',
      '/finance/invoices',
      '/finance/checks',
      '/system/logs',
      '/system/schema',
      '/system/sync',
      '/system/test-sale',
      '/system/settings',
    ],
    homepage: '/admin/dashboard',
    label: 'Super Administrator',
  },
};

/**
 * Check if a user role can access a given route
 */
export function canAccess(route: string, role: UserRole): boolean {
  const config = ROLE_CONFIG[role];
  if (!config) return false;

  // Check if route exactly matches an allowed route
  const exactMatch = config.allowedRoutes.some((allowed) => route === allowed);
  if (exactMatch) return true;

  // Check if route is a sub-route of an allowed route
  const prefixMatch = config.allowedRoutes.some((allowed) =>
    route.startsWith(allowed + '/')
  );
  if (prefixMatch) return true;

  // Check read-only routes
  if (config.readOnlyRoutes) {
    const readOnlyMatch = config.readOnlyRoutes.some(
      (allowed) => route === allowed || route.startsWith(allowed + '/')
    );
    if (readOnlyMatch) return true;
  }

  return false;
}

/**
 * Check if a route is read-only for a given role
 */
export function isReadOnly(route: string, role: UserRole): boolean {
  const config = ROLE_CONFIG[role];
  if (!config.readOnlyRoutes) return false;

  return config.readOnlyRoutes.some(
    (readOnly) => route === readOnly || route.startsWith(readOnly + '/')
  );
}

/**
 * Get the homepage for a given role
 */
export function getHomepage(role: UserRole): string {
  return ROLE_CONFIG[role]?.homepage || '/dashboard';
}

/**
 * Get navigation items for a given role
 */
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
}

export function getNavigationItems(role: UserRole): NavItem[] {
  const items: NavItem[] = [];

  // Shopper navigation
  if (canAccess('/dashboard', role)) {
    items.push({
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
    });
  }

  if (canAccess('/deals', role)) {
    items.push({
      label: 'My Deals',
      href: '/deals',
      icon: 'Briefcase',
    });
  }

  if (canAccess('/commissions', role)) {
    items.push({
      label: 'Commissions',
      href: '/commissions',
      icon: 'DollarSign',
    });
  }

  // Admin navigation
  if (canAccess('/admin/dashboard', role)) {
    items.push({
      label: 'Admin',
      href: '/admin/dashboard',
      icon: 'Shield',
      children: [
        { label: 'Dashboard', href: '/admin/dashboard' },
        { label: 'All Deals', href: '/admin/deals' },
        { label: 'Shoppers', href: '/admin/shoppers' },
        { label: 'Buyers', href: '/admin/buyers' },
        { label: 'Suppliers', href: '/admin/suppliers' },
        { label: 'Commission', href: '/admin/commission' },
        { label: 'Errors', href: '/admin/errors' },
        { label: 'Month End', href: '/admin/month-end' },
      ],
    });
  }

  // Finance navigation
  if (canAccess('/finance/dashboard', role)) {
    items.push({
      label: 'Finance',
      href: '/finance/dashboard',
      icon: 'Calculator',
      children: [
        { label: 'Dashboard', href: '/finance/dashboard' },
        { label: 'Commissions', href: '/finance/commissions' },
        { label: 'Exports', href: '/finance/exports' },
        { label: 'Invoices', href: '/finance/invoices' },
        { label: 'Checks', href: '/finance/checks' },
      ],
    });
  }

  // System navigation (superadmin only)
  if (canAccess('/system/logs', role)) {
    items.push({
      label: 'System',
      href: '/system/logs',
      icon: 'Settings',
      children: [
        { label: 'Logs', href: '/system/logs' },
        { label: 'Schema', href: '/system/schema' },
        { label: 'Sync Inspector', href: '/system/sync' },
        { label: 'Test Sale', href: '/system/test-sale' },
        { label: 'Settings', href: '/system/settings' },
      ],
    });
  }

  return items;
}
