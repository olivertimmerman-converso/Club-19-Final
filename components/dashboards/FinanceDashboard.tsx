/**
 * Club 19 Sales OS - Finance Dashboard
 */

export function FinanceDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">
        Finance Dashboard
      </h1>
      <p className="text-gray-600 mb-8">
        Financial overview and reporting
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Outstanding</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Overdue</h3>
          <p className="text-2xl font-bold text-red-600">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Commissions Due</h3>
          <p className="text-2xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Paid</h3>
          <p className="text-2xl font-bold text-green-600">-</p>
        </div>
      </div>
    </div>
  );
}
