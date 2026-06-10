"use client";

import { cn } from "@/lib/utils";

/** Standard page scaffold: title row + optional filter bar + scroll-safe body. */
export function PageShell({
  title,
  actions,
  filterBar,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-5 pb-2 pt-3">
        <h1 className="text-[22px] font-bold text-[#0F1629]">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {filterBar}
      <div className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-5", className)}>
        {children}
      </div>
    </div>
  );
}

/** Summary stat used in the summary bars above tables. */
export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[10px] border border-[#E8ECF4] bg-white px-3.5 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        {label}
      </span>
      <span className="mt-0.5 text-[16px] font-bold tabular-nums text-[#0F1629]">{value}</span>
      {sub && <span className="text-[11px] text-[#94A3B8]">{sub}</span>}
    </div>
  );
}
