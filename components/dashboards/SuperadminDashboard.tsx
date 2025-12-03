/**
 * Club 19 Sales OS - Superadmin Dashboard
 */

export function SuperadminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">
        Superadmin Dashboard
      </h1>
      <p className="text-gray-600 mb-8">
        Full system access and administration
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">System Health</h3>
          <p className="text-2xl font-bold text-green-600">Good</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">API Status</h3>
          <p className="text-2xl font-bold text-green-600">Online</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">DB Status</h3>
          <p className="text-2xl font-bold text-green-600">Online</p>
        </div>
      </div>
    </div>
  );
}
