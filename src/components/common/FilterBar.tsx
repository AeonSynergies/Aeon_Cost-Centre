"use client";

import { useOpsStore } from "@/store/filterStore";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Period filter: Month + Year dropdowns wired to the global store. Replaces the
 * old date-range pills. Place anywhere a period scope is needed.
 */
export function PeriodFilter() {
  const { periodYear, periodMonth, setPeriod } = useOpsStore();
  const years = [2025, 2026, 2027];
  return (
    <div className="flex items-center gap-2">
      <select
        value={periodMonth}
        onChange={(e) => setPeriod(periodYear, Number(e.target.value))}
        className="h-[30px] rounded-[7px] border border-[#E8ECF4] bg-white px-2 text-[12px] text-[#0F1629] outline-none focus:border-[#3266AD]"
        aria-label="Month"
      >
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select
        value={periodYear}
        onChange={(e) => setPeriod(Number(e.target.value), periodMonth)}
        className="h-[30px] rounded-[7px] border border-[#E8ECF4] bg-white px-2 text-[12px] text-[#0F1629] outline-none focus:border-[#3266AD]"
        aria-label="Year"
      >
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

/**
 * Standard filter bar shell: a Month/Year period selector plus a slot for
 * screen-specific filters (department, cost centre, status, etc.).
 */
export function FilterBar({ children, period = true }: { children?: React.ReactNode; period?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#E8ECF4] bg-white px-5 py-2.5">
      {period && <PeriodFilter />}
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
