"use client";

import { cn } from "@/lib/utils";

export interface StatusPillOption {
  value: string;
  label: string;
  count?: number;
}

/** Pill toggle group for status filters. Active pill highlighted blue. */
export function StatusPills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: StatusPillOption[];
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[7px] bg-[#F1F5F9] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
            value === o.value ? "bg-[#3266AD] text-white shadow-sm" : "text-[#64748B] hover:text-[#0F1629]"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 opacity-70">({o.count})</span>}
        </button>
      ))}
    </div>
  );
}
