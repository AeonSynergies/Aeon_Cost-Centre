"use client";

import { Badge, type BadgeTone } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    ACTIVE: { tone: "success", label: "Active" },
    TERMED: { tone: "error", label: "Termed" },
    CHURNED: { tone: "error", label: "Churned" },
    ENDING: { tone: "warning", label: "Ending" },
    ISSUED: { tone: "info", label: "Issued" },
    RETURNED: { tone: "neutral", label: "Returned" },
    LOST: { tone: "error", label: "Lost" },
    DRAFT: { tone: "neutral", label: "Draft" },
    SUBMITTED: { tone: "info", label: "Submitted" },
    APPROVED: { tone: "success", label: "Approved" },
    FINALISED: { tone: "success", label: "Finalised" },
  };
  const v = map[status] ?? { tone: "neutral" as BadgeTone, label: status };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

const CATEGORY_LABELS: Record<string, { tone: BadgeTone; label: string }> = {
  CLIENT_FACING: { tone: "success", label: "Client Facing" },
  ADMINISTRATION: { tone: "info", label: "Administration" },
  BUSINESS_DEVELOPMENT: { tone: "warning", label: "Business Dev" },
  INTERNAL: { tone: "neutral", label: "Internal" },
  SAAS_DEVELOPMENT: { tone: "purple", label: "SaaS Dev" },
};

export function CategoryBadge({ category }: { category: string }) {
  const v = CATEGORY_LABELS[category] ?? { tone: "neutral" as BadgeTone, label: category };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export const DEPT_CATEGORY_OPTIONS = [
  { value: "CLIENT_FACING", label: "Client Facing" },
  { value: "ADMINISTRATION", label: "Administration" },
  { value: "BUSINESS_DEVELOPMENT", label: "Business Development" },
  { value: "INTERNAL", label: "Internal" },
  { value: "SAAS_DEVELOPMENT", label: "SaaS Development" },
];

export function CodeBadges({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((c) => (
        <span key={c} className="rounded-[5px] bg-[#E6F1FB] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0C447C]">
          {c}
        </span>
      ))}
    </div>
  );
}
