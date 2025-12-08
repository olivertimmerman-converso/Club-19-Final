/**
 * Club 19 Sales OS - Admin Dashboard
 */

interface AdminDashboardProps {
  monthParam?: string;
}

export function AdminDashboard({ monthParam }: AdminDashboardProps) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">
        Admin Dashboard
      </h1>
      <p className="text-gray-600 mb-8">
        Operations overview and team management
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Sales</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Team Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Deals</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Margin</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
      </div>
    </div>
  );
}
