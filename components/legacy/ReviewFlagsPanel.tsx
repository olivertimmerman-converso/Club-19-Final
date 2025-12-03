/**
 * Club 19 Sales OS - Review Flags Panel
 *
 * Panel showing items requiring review
 */

import { ReviewFlags } from "@/lib/legacyData";
import { AlertTriangle } from "lucide-react";

interface ReviewFlagsPanelProps {
  flags: ReviewFlags;
}

export function ReviewFlagsPanel({ flags }: ReviewFlagsPanelProps) {
  const totalFlags =
    flags.clientsRequiringReview +
    flags.suppliersRequiringReview +
    flags.tradesWithoutDates;

  if (totalFlags === 0) {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center gap-3">
          <div className="text-green-600">✓</div>
          <div>
            <h3 className="text-sm font-semibold text-green-900">All Clear</h3>
            <p className="text-xs text-green-700">No review items found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-900 mb-3">
            Items Requiring Review ({totalFlags})
          </h3>

          <div className="space-y-2 text-sm">
            {flags.clientsRequiringReview > 0 && (
              <div className="flex justify-between">
                <span className="text-yellow-700">Clients with conflicts:</span>
                <span className="font-medium text-yellow-900">
                  {flags.clientsRequiringReview}
                </span>
              </div>
            )}

            {flags.suppliersRequiringReview > 0 && (
              <div className="flex justify-between">
                <span className="text-yellow-700">Suppliers needing review:</span>
                <span className="font-medium text-yellow-900">
                  {flags.suppliersRequiringReview}
                </span>
              </div>
            )}

            {flags.tradesWithoutDates > 0 && (
              <div className="flex justify-between">
                <span className="text-yellow-700">Trades missing dates:</span>
                <span className="font-medium text-yellow-900">
                  {flags.tradesWithoutDates}
                </span>
              </div>
            )}
          </div>

          {flags.clientDetails.length > 0 && (
            <div className="mt-4 pt-4 border-t border-yellow-200">
              <h4 className="text-xs font-semibold text-yellow-900 mb-2">
                Client Details:
              </h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                {flags.clientDetails.map((client, idx) => (
                  <li key={idx}>
                    • {client.client} - {client.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
