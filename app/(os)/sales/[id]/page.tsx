/**
export const dynamic = "force-dynamic";

 * Club 19 Sales OS - Sale Detail
 */

export default function SaleDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Sale #{params.id}</h1>
      <p className="text-gray-600">Sale detail view</p>
    </div>
  );
}
