"use client";

import { Stat } from "@/components/common/PageShell";

export interface SummaryItem {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

/** KPI summary strip above tables. */
export function SummaryBar({ items }: { items: SummaryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((it) => (
        <Stat key={it.label} label={it.label} value={it.value} sub={it.sub} />
      ))}
    </div>
  );
}
