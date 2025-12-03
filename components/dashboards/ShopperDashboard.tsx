/**
 * Club 19 Sales OS - Shopper Dashboard
 */

export function ShopperDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">
        Shopper Dashboard
      </h1>
      <p className="text-gray-600 mb-8">
        Welcome to your sales overview
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Sales</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Commission</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
      </div>
    </div>
  );
}
