"use client";

import { cn } from "@/lib/utils";
import { useOpsStore, type DateRange } from "@/store/filterStore";

const RANGES: DateRange[] = ["Week", "Month", "Quarter", "Year", "Till Date", "Custom"];

/**
 * Standard filter bar shell: date-range pills (wired to the global store) plus
 * a slot for screen-specific filters (department, cost centre, status, etc.).
 */
export function FilterBar({ children }: { children?: React.ReactNode }) {
  const { dateRange, setDateRange } = useOpsStore();

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#E8ECF4] bg-white px-5 py-2.5">
      <div className="flex items-center gap-0.5 rounded-[7px] bg-[#F1F5F9] p-0.5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
              dateRange === r
                ? "bg-white text-[#0F1629] shadow-sm"
                : "text-[#64748B] hover:text-[#0F1629]"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Compact labelled <select> used inside the filter bar. */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[30px] rounded-[7px] border border-[#E8ECF4] bg-white px-2 text-[12px] text-[#0F1629] outline-none focus:border-[#3266AD]"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
