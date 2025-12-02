/**
 * Club 19 Sales OS - Authenticity Badge Component
 *
 * Risk indicator for authenticity verification status
 */

import { ShieldCheck, ShieldAlert, ShieldX, Shield } from "lucide-react";

interface AuthenticityBadgeProps {
  authenticity_status: string;
  authenticity_risk: "clean" | "missing_receipt" | "not_verified" | "high_risk";
  showIcon?: boolean;
}

const riskConfig = {
  clean: {
    label: "Verified",
    icon: ShieldCheck,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
  },
  missing_receipt: {
    label: "Missing Receipt",
    icon: ShieldAlert,
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
    iconColor: "text-orange-600",
  },
  not_verified: {
    label: "Not Verified",
    icon: Shield,
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
  },
  high_risk: {
    label: "High Risk",
    icon: ShieldX,
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
  },
};

export function AuthenticityBadge({
  authenticity_status,
  authenticity_risk,
  showIcon = true,
}: AuthenticityBadgeProps) {
  const config = riskConfig[authenticity_risk] || riskConfig.not_verified;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {showIcon && <Icon size={14} className={config.iconColor} />}
      {config.label}
    </span>
  );
}
