"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { initials, formatPeriod } from "@/lib/utils";
import { useOpsStore } from "@/lib/store";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function titleCase(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Topbar({ user }: { user: { name: string } }) {
  const pathname = usePathname();
  const { periodYear, periodMonth, setPeriod } = useOpsStore();

  const crumbs = pathname.split("/").filter(Boolean).map(titleCase);
  const years = [periodYear - 1, periodYear, periodYear + 1];

  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-[#E8ECF4] bg-white px-5">
      <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
        {crumbs.length === 0 ? (
          <span className="font-medium text-[#0F1629]">Dashboard</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#CBD5E1]">/</span>}
              <span className={i === crumbs.length - 1 ? "font-medium text-[#0F1629]" : ""}>
                {c}
              </span>
            </span>
          ))
        )}
      </div>

      <div className="flex items-center gap-1 rounded-full border border-[#E8ECF4] bg-[#F8F9FC] px-1 py-0.5">
        <select
          value={periodMonth}
          onChange={(e) => setPeriod(periodYear, Number(e.target.value))}
          className="bg-transparent px-1 text-[12px] font-medium text-[#0F1629] outline-none"
          aria-label="Month"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={periodYear}
          onChange={(e) => setPeriod(Number(e.target.value), periodMonth)}
          className="bg-transparent px-1 text-[12px] font-medium text-[#0F1629] outline-none"
          aria-label="Year"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="sr-only">{formatPeriod(periodYear, periodMonth)}</span>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-1.5 text-[#64748B] hover:bg-[#F1F5F9]">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D85A30]" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3266AD] text-[11px] font-bold text-white">
          {initials(user.name)}
        </div>
      </div>
    </header>
  );
}
