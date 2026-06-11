"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBadges } from "@/components/common/StatusBadge";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr } from "@/lib/utils";

type DeptMonthly = { month: string; netRevenueInr: number; deptReserveBudget: number; deptReserveActual: number; afShare: number; pcShare: number; taShare: number; voShare: number; bdBudget: number; bdActual: number; productBudget: number; productActual: number; profitBudget: number; profitActual: number };
type Bucket = { key: string; pct: number; budget: number; actual: number };
type ResMonthly = { month: string; resourceId: string; resource: string; department: string; clients: number; services: string[]; revenueInr: number; allottedInr: number; costInr: number; surplusInr: number; marginPct: number };
type Data = {
  year: number;
  department: { kpi: { totalNetRevenueInr: number; deptReserveInr: number; companyPoolInr: number; overBudgetCount: number }; buckets: Bucket[]; monthly: DeptMonthly[] };
  resource: { summary: { revenueInr: number; allottedInr: number; costInr: number; netMarginInr: number }; monthly: ResMonthly[] };
};

export default function AllocationPage() {
  const router = useRouter();
  const { periodYear } = useOpsStore();
  const [year, setYear] = React.useState(periodYear);
  const { data } = useSWR<Data>(`/api/allocation?year=${year}`, apiGet);
  const dept = data?.department;
  const res = data?.resource;

  return (
    <PageShell
      title="Allocation"
      filterBar={
        <FilterBar>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-[30px] rounded-[7px] border border-[#E8ECF4] px-2 text-[12px]">
            {[2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </FilterBar>
      }
    >
      <Tabs defaultValue="dept" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="dept">Department Allocation</TabsTrigger>
          <TabsTrigger value="resource">Resource Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="dept">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total Net Revenue (INR)" value={dept ? formatInr(dept.kpi.totalNetRevenueInr) : "—"} />
            <KpiCard label="Dept Reserve 50% (INR)" value={dept ? formatInr(dept.kpi.deptReserveInr) : "—"} />
            <KpiCard label="Company Pool 50% (INR)" value={dept ? formatInr(dept.kpi.companyPoolInr) : "—"} />
            <KpiCard label="Over-budget Buckets" value={dept?.kpi.overBudgetCount ?? "—"} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {dept?.buckets.map((b) => {
              const over = b.actual > b.budget && b.budget > 0;
              const ratio = b.budget > 0 ? Math.min(100, (b.actual / b.budget) * 100) : 0;
              return (
                <Card key={b.key} className="p-4">
                  <div className="flex items-center justify-between">
                    <SectionTitle>{b.key}</SectionTitle>
                    <Badge tone={over ? "error" : "success"}>{b.pct}%</Badge>
                  </div>
                  <div className="mt-2 text-[12px] text-[#64748B]">Budget <span className="float-right font-semibold text-[#0F1629]">{formatInr(b.budget)}</span></div>
                  <div className="text-[12px] text-[#64748B]">Actual <span className="float-right font-semibold text-[#0F1629]">{formatInr(b.actual)}</span></div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]"><div style={{ width: `${ratio}%`, background: over ? "#D85A30" : "#1D9E75" }} className="h-full" /></div>
                  <div className="mt-1 text-[10px] font-semibold" style={{ color: over ? "#D85A30" : "#1D9E75" }}>{over ? "Over budget" : "Within budget"}</div>
                </Card>
              );
            })}
          </div>

          <Card className="mt-3 overflow-auto p-4">
            <SectionTitle>Monthly Allocation</SectionTitle>
            <table className="mt-2 w-full whitespace-nowrap text-[11px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Net Revenue</th><th>Reserve Budget</th><th>Reserve Actual</th><th>A&amp;F</th><th>P&amp;C</th><th>TA</th><th>VO</th><th>BD Budget</th><th>BD Actual</th><th>Prod Budget</th><th>Prod Actual</th><th>Profit Budget</th><th>Profit Actual</th></tr></thead>
              <tbody>
                {dept?.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-[#E8ECF4] tabular-nums">
                    <td className="py-2 font-medium">{m.month}</td>
                    <td>{formatInr(m.netRevenueInr)}</td><td>{formatInr(m.deptReserveBudget)}</td><td>{formatInr(m.deptReserveActual)}</td>
                    <td>{formatInr(m.afShare)}</td><td>{formatInr(m.pcShare)}</td><td>{formatInr(m.taShare)}</td><td>{formatInr(m.voShare)}</td>
                    <td>{formatInr(m.bdBudget)}</td><td>{formatInr(m.bdActual)}</td><td>{formatInr(m.productBudget)}</td><td>{formatInr(m.productActual)}</td>
                    <td>{formatInr(m.profitBudget)}</td><td>{formatInr(m.profitActual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="resource">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total Revenue Generated" value={res ? formatInr(res.summary.revenueInr) : "—"} />
            <Stat label="Total 50% Allotted" value={res ? formatInr(res.summary.allottedInr) : "—"} />
            <Stat label="Total Cost" value={res ? formatInr(res.summary.costInr) : "—"} />
            <Stat label="Net Margin" value={res ? formatInr(res.summary.netMarginInr) : "—"} />
          </div>

          <Card className="mt-3 overflow-auto p-4">
            <SectionTitle>Monthly Resource Allocation</SectionTitle>
            <table className="mt-2 w-full whitespace-nowrap text-[11px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Resource</th><th>Department</th><th>Clients</th><th>Services</th><th>Revenue (₹)</th><th>50% Allotted (₹)</th><th>Cost (₹)</th><th>Surplus (₹)</th><th>Margin %</th></tr></thead>
              <tbody>
                {res?.monthly.length === 0 && <tr><td colSpan={10} className="py-4 text-center text-[#94A3B8]">No billing data yet — generate billing first.</td></tr>}
                {res?.monthly.map((m, i) => (
                  <tr key={i} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${m.resourceId}`)}>
                    <td className="py-2">{m.month}</td><td className="font-medium">{m.resource}</td><td>{m.department}</td><td>{m.clients}</td>
                    <td><CodeBadges codes={m.services} /></td>
                    <td>{formatInr(m.revenueInr)}</td><td>{formatInr(m.allottedInr)}</td><td>{formatInr(m.costInr)}</td>
                    <td className={m.surplusInr < 0 ? "text-[#D85A30]" : "text-[#1D9E75]"}>{formatInr(m.surplusInr)}</td>
                    <td>{m.marginPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
