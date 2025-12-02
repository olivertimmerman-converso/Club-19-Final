/**
 * Club 19 Sales OS - Unauthorised Access Page
 *
 * Shown when user attempts to access a route they don't have permission for
 */

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getUserRole } from "@/lib/auth";
import { getHomepage } from "@/lib/rbac";

export default async function UnauthorisedPage() {
  const role = await getUserRole();
  const homepage = role ? getHomepage(role) : "/sign-in";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert size={40} className="text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You do not have permission to access this page. Please contact your administrator if
          you believe this is an error.
        </p>

        <Link
          href={homepage}
          className="inline-block w-full px-6 py-3 bg-[#0A0A0A] text-white font-medium rounded-lg hover:bg-[#0A0A0A]/90 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
