"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChevronRight, ChevronDown } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Badge } from "@/components/ui/badge";

import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr } from "@/lib/utils";

const MONTH_INDEX: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

type DeptSummary = {
  year: number;
  kpi: { totalNetRevenueInr: number; deptReserveInr: number; companyPoolInr: number; overBudgetCount: number };
  buckets: { key: string; pct: number; budget: number; actual: number }[];
  monthly: { month: string; netRevenueInr: number; deptReserveInr: number; opsActual: number; opsSurplusInr: number; bdBudget: number; bdActual: number; productBudget: number; productActual: number; profitBudget: number; profitActual: number; status: string }[];
};

export default function AllocationPage() {
  const { periodYear } = useOpsStore();
  const [year, setYear] = React.useState(periodYear);

  return (
    <PageShell
      title="Allocation"
      filterBar={
        <FilterBar period={false}>
          <span className="text-[12px] text-[#64748B]">Year</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-[30px] rounded-[7px] border border-[#E8ECF4] bg-white px-2 text-[12px] outline-none focus:border-[#3266AD]">
            {[2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </FilterBar>
      }
    >
      <DeptTab year={year} />
    </PageShell>
  );
}

function surplusColor(v: number) {
  return v > 0 ? "text-[#1D9E75]" : v < 0 ? "text-[#D85A30]" : "text-[#94A3B8]";
}

function DeptTab({ year }: { year: number }) {
  const router = useRouter();
  const { data } = useSWR<DeptSummary>(`/api/allocation/departments?year=${year}`, apiGet);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data?.buckets.map((b) => {
          const over = b.actual > b.budget && b.budget > 0;
          const ratio = b.budget > 0 ? Math.min(100, (b.actual / b.budget) * 100) : 0;
          return (
            <Card key={b.key} className="p-4">
              <div className="flex items-center justify-between"><SectionTitle>{b.key}</SectionTitle><Badge tone={over ? "error" : "success"}>{b.pct}%</Badge></div>
              <div className="mt-2 text-[12px] text-[#64748B]">YTD Budget <span className="float-right font-semibold text-[#0F1629]">{formatInr(b.budget)}</span></div>
              <div className="text-[12px] text-[#64748B]">YTD Actual <span className="float-right font-semibold text-[#0F1629]">{formatInr(b.actual)}</span></div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]"><div style={{ width: `${ratio}%`, background: over ? "#D85A30" : "#1D9E75" }} className="h-full" /></div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-3 overflow-auto p-4">
        <SectionTitle>Month-on-Month Summary</SectionTitle>
        <table className="mt-2 w-full whitespace-nowrap text-[11px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2"></th><th>Month</th><th>Net Revenue (INR)</th><th>Ops Budget</th><th>Ops Actual</th><th>Surplus/(Deficit)</th><th>BD Budget</th><th>BD Actual</th><th>Product Budget</th><th>Product Actual</th><th>Profit / Surplus</th><th>Status</th></tr></thead>
          <tbody>
            {data?.monthly.map((m) => (
              <React.Fragment key={m.month}>
                <tr className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => setExpanded(expanded === m.month ? null : m.month)}>
                  <td className="py-2">{expanded === m.month ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</td>
                  <td className="font-medium">{m.month}</td>
                  <td>{formatInr(m.netRevenueInr)}</td><td>{formatInr(m.deptReserveInr)}</td><td>{formatInr(m.opsActual)}</td>
                  <td className={m.opsSurplusInr < 0 ? "text-[#D85A30]" : "text-[#1D9E75]"}>{formatInr(m.opsSurplusInr)}</td>
                  <td>{formatInr(m.bdBudget)}</td><td>{formatInr(m.bdActual)}</td>
                  <td>{formatInr(m.productBudget)}</td><td>{formatInr(m.productActual)}</td>
                  <td className={m.profitActual < 0 ? "text-[#D85A30]" : "text-[#1D9E75]"}>{formatInr(m.profitActual)}</td>
                  <td><Badge tone={m.status === "Over budget" ? "error" : "success"}>{m.status}</Badge></td>
                </tr>
                {expanded === m.month && <ExpandedRow year={year} month={MONTH_INDEX[m.month]} onClient={(id) => router.push(`/departments/${id}`)} />}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function ExpandedRow({ year, month, onClient }: { year: number; month: number; onClient: (id: string) => void }) {
  const { data } = useSWR<{ breakdown: { id: string; name: string; revenueInr: number; deptReserveInr: number; workforceCostInr: number; toolCostInr: number; totalDeptCostInr: number; surplusInr: number }[] }>(`/api/allocation/departments?year=${year}&month=${month}`, apiGet);
  return (
    <tr><td colSpan={12} className="bg-[#F8F9FC] p-3">
      <table className="w-full text-[11px]">
        <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-1">Department</th><th>Revenue</th><th>Dept Reserve 50%</th><th>Workforce Cost</th><th>Tool Cost</th><th>Total Dept Cost</th><th>Surplus/(Deficit)</th></tr></thead>
        <tbody>
          {data?.breakdown.map((d) => (
            <tr key={d.id} className="cursor-pointer border-t border-[#E8ECF4] tabular-nums hover:bg-white" onClick={() => onClient(d.id)}>
              <td className="py-1.5 font-medium">{d.name}</td>
              <td>{formatInr(d.revenueInr)}</td><td>{formatInr(d.deptReserveInr)}</td><td>{formatInr(d.workforceCostInr)}</td>
              <td>{formatInr(d.toolCostInr)}</td><td>{formatInr(d.totalDeptCostInr)}</td>
              <td className={surplusColor(d.surplusInr)}>{formatInr(d.surplusInr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </td></tr>
  );
}

