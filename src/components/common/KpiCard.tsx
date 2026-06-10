"use client";

import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card className="px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</div>
      <div className="mt-0.5 text-[18px] font-bold tabular-nums text-[#0F1629]">{value}</div>
      {sub && <div className="text-[11px] text-[#94A3B8]">{sub}</div>}
    </Card>
  );
}
