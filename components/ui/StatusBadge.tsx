/**
 * Club 19 Sales OS - Status Badge Component
 *
 * Colored badge for sale status display
 */

interface StatusBadgeProps {
  status: "draft" | "invoiced" | "paid" | "locked" | "commission_paid";
}

const statusConfig = {
  draft: {
    label: "Draft",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
  },
  invoiced: {
    label: "Invoiced",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
  },
  paid: {
    label: "Paid",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  locked: {
    label: "Locked",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  commission_paid: {
    label: "Commission Paid",
    bgColor: "bg-[#F3DFA2]/20",
    textColor: "text-[#0A0A0A]",
    borderColor: "border-[#F3DFA2]",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {config.label}
    </span>
  );
}
