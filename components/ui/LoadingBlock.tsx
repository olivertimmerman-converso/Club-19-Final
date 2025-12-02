/**
 * Club 19 Sales OS - Loading Block Component
 *
 * Gold spinner on black background for loading states
 */

import { Loader2 } from "lucide-react";

interface LoadingBlockProps {
  message?: string;
}

export function LoadingBlock({ message = "Loading..." }: LoadingBlockProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 size={48} className="animate-spin text-[#F3DFA2]" />
      <p className="mt-4 text-gray-600 font-medium">{message}</p>
    </div>
  );
}
