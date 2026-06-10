"use client";

import * as React from "react";
import useSWRImmutable from "swr/immutable";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { apiGet } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]; // index 0=Sun..6=Sat

/** Mon–Sun chips with active days filled blue. workingDays = array of 0-6. */
export function WorkingDayChips({ days }: { days: number[] }) {
  const set = new Set(days);
  return (
    <div className="flex gap-0.5">
      {DAYS.map((d, i) => (
        <span
          key={i}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-[3px] text-[8px] font-bold",
            set.has(i) ? "bg-[#3266AD] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"
          )}
        >
          {d}
        </span>
      ))}
    </div>
  );
}

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

export function UtilBar({ pct }: { pct: number }) {
  const color = pct > 100 || pct < 40 ? "#D85A30" : pct >= 80 ? "#1D9E75" : "#BA7517";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div style={{ width: `${Math.min(100, pct)}%`, background: color }} className="h-full" />
      </div>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export interface ReferenceData {
  departments: { id: string; name: string; category: string }[];
  costCentres: { id: string; name: string; departmentId: string | null }[];
  services: {
    id: string;
    code: string;
    name: string;
    departmentId: string;
    costCentreId: string;
    packages: { packageType: string; monthlyFeeUsd: number }[];
  }[];
  clients: { id: string; name: string; endDate: string | null }[];
  resources: { id: string; name: string; employeeNumber: string }[];
}

export function useReference() {
  return useSWRImmutable<ReferenceData>("/api/reference", apiGet);
}

export function Avatar({ name }: { name: string }) {
  const init = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F1FB] text-[10px] font-bold text-[#3266AD]">
      {init}
    </span>
  );
}
