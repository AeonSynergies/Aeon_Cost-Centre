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

export function CategoryBadge({ category }: { category: string }) {
  if (category === "CLIENT_FACING") return <Badge tone="success">Client-facing</Badge>;
  if (category === "BUSINESS_DEVELOPMENT") return <Badge tone="warning">Business Dev</Badge>;
  return <Badge tone="purple">Product Dev</Badge>;
}

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
