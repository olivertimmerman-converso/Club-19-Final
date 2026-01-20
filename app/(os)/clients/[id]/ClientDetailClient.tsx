'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ClientDetailClientProps {
  client: {
    id: string;
    name: string | null;
    email: string | null;
    owner: { id: string; name: string } | null;
    owner_changed_at: string | null;
    owner_changed_by: string | null;
  };
  shoppers: { id: string; name: string }[];
  userRole: string | null;
  stats: {
    totalSpend: number;
    totalMargin: number;
    tradesCount: number;
    totalSales: number;
  };
  sales: Array<{
    id: string;
    sale_date: string | null;
    item_title: string | null;
    brand: string | null;
    sale_amount_inc_vat: number;
    gross_margin: number;
    xero_invoice_number: string | null;
    invoice_status: string | null;
    currency: string | null;
    source: string | null;
  }>;
}

export function ClientDetailClient({
  client,
  shoppers,
  userRole,
  stats,
  sales,
}: ClientDetailClientProps) {
  const router = useRouter();
  const [selectedOwner, setSelectedOwner] = useState<string>(client.owner?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isSuperadmin = userRole === 'superadmin';
  const hasOwnerChanged = selectedOwner !== (client.owner?.id || '');

  // Format currency
  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format datetime for owner change
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if sale is paid (for visual styling)
  const isPaid = (status: string | null) => {
    return status?.toUpperCase() === 'PAID';
  };

  // Format status badge
  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-gray-400">—</span>;

    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      AUTHORISED: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-700',
      VOIDED: 'bg-red-100 text-red-700',
    };

    const statusLabels: Record<string, string> = {
      AUTHORISED: 'Awaiting Payment',
    };

    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700';
    const label = statusLabels[status] || status;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      >
        {label}
      </span>
    );
  };

  // Save owner change
  const handleSaveOwner = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: selectedOwner || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update owner');
      }

      setSaveSuccess(true);
      // Refresh page data
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to update owner');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Clients
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            {client.name || 'Unnamed Client'}
          </h1>
          {client.email && <p className="text-gray-600">{client.email}</p>}
        </div>
        <Link
          href="#"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit Client
        </Link>
      </div>

      {/* Owner Assignment Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Client Owner</h3>

        {isSuperadmin ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                disabled={isSaving}
              >
                <option value="">Unassigned</option>
                {shoppers.map((shopper) => (
                  <option key={shopper.id} value={shopper.id}>
                    {shopper.name}
                  </option>
                ))}
              </select>

              {hasOwnerChanged && (
                <button
                  onClick={handleSaveOwner}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              )}

              {saveSuccess && (
                <span className="text-sm text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Saved
                </span>
              )}
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            {client.owner_changed_at && (
              <p className="text-xs text-gray-500">
                Last changed: {formatDateTime(client.owner_changed_at)}
              </p>
            )}
          </div>
        ) : (
          <div>
            {client.owner ? (
              <p className="text-gray-900">{client.owner.name}</p>
            ) : (
              <p className="text-gray-400 italic">Unassigned</p>
            )}
            {client.owner_changed_at && (
              <p className="text-xs text-gray-500 mt-2">
                Last changed: {formatDateTime(client.owner_changed_at)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Spend</h3>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalSpend)}</p>
          <p className="text-xs text-gray-500 mt-1">Paid invoices only</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Margin</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalMargin)}</p>
          <p className="text-xs text-gray-500 mt-1">Paid invoices only</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Paid Sales</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.tradesCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.totalSales} total ({stats.totalSales - stats.tradesCount} unpaid)
          </p>
        </div>
      </div>

      {/* Purchase History Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchase History</h2>

        {sales.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No purchases yet</h3>
            <p className="mt-1 text-sm text-gray-500">This client has not made any purchases.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Item
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Brand
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Margin
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Invoice #
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => {
                    const paid = isPaid(sale.invoice_status);
                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-gray-50 transition-colors ${!paid ? 'opacity-50 bg-gray-50' : ''}`}
                        title={!paid ? 'Not counted in totals (unpaid)' : ''}
                      >
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${paid ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                          {formatDate(sale.sale_date)}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm max-w-xs truncate ${paid ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                          <Link
                            href={`/sales/${sale.id}`}
                            className={
                              paid
                                ? 'text-purple-600 hover:text-purple-900'
                                : 'text-gray-400 hover:text-gray-600'
                            }
                          >
                            {sale.item_title || '—'}
                          </Link>
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${paid ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                          {sale.brand || '—'}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${paid ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                          {formatCurrency(sale.sale_amount_inc_vat)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${paid ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {formatCurrency(sale.gross_margin)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${paid ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                          {sale.xero_invoice_number || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(sale.invoice_status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
