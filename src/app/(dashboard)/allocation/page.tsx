"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChevronRight, ChevronDown } from "lucide-react";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBadges } from "@/components/common/StatusBadge";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatPeriod } from "@/lib/utils";

const MONTH_INDEX: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

type DeptSummary = {
  year: number;
  kpi: { totalNetRevenueInr: number; deptReserveInr: number; companyPoolInr: number; overBudgetCount: number };
  buckets: { key: string; pct: number; budget: number; actual: number }[];
  monthly: { month: string; netRevenueInr: number; deptReserveInr: number; bdBudget: number; bdActual: number; productBudget: number; productActual: number; profitBudget: number; profitActual: number; status: string }[];
};
type ResRow = { resourceId: string; resource: string; employeeNumber: string; department: string; clients: number; services: string[]; revenueInr: number; allottedInr: number; costInr: number; surplusInr: number; marginPct: number };

export default function AllocationPage() {
  const { periodYear, periodMonth } = useOpsStore();

  return (
    <PageShell title="Allocation" filterBar={<FilterBar />}>
      <Tabs defaultValue="dept" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="dept">Department Allocation</TabsTrigger>
          <TabsTrigger value="resource">Resource Allocation</TabsTrigger>
        </TabsList>
        <TabsContent value="dept"><DeptTab year={periodYear} /></TabsContent>
        <TabsContent value="resource"><ResourceTab year={periodYear} month={periodMonth} /></TabsContent>
      </Tabs>
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
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2"></th><th>Month</th><th>Net Revenue</th><th>Dept Reserve 50%</th><th>BD Budget</th><th>BD Actual</th><th>Prod Budget</th><th>Prod Actual</th><th>Profit Budget</th><th>Profit Actual</th><th>Status</th></tr></thead>
          <tbody>
            {data?.monthly.map((m) => (
              <React.Fragment key={m.month}>
                <tr className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => setExpanded(expanded === m.month ? null : m.month)}>
                  <td className="py-2">{expanded === m.month ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</td>
                  <td className="font-medium">{m.month}</td>
                  <td>{formatInr(m.netRevenueInr)}</td><td>{formatInr(m.deptReserveInr)}</td>
                  <td>{formatInr(m.bdBudget)}</td><td>{formatInr(m.bdActual)}</td>
                  <td>{formatInr(m.productBudget)}</td><td>{formatInr(m.productActual)}</td>
                  <td>{formatInr(m.profitBudget)}</td><td>{formatInr(m.profitActual)}</td>
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
    <tr><td colSpan={11} className="bg-[#F8F9FC] p-3">
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

function ResourceTab({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const { data } = useSWR<{ data: ResRow[]; summary: Record<string, number> }>(`/api/allocation/resources?year=${year}&month=${month}`, apiGet);
  const s = data?.summary;

  return (
    <>
      <div className="mb-1 text-[12px] text-[#64748B]">Showing {formatPeriod(year, month)} — change month via the period selector.</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Revenue Generated" value={s ? formatInr(s.revenueInr) : "—"} />
        <Stat label="50% Allotted" value={s ? formatInr(s.allottedInr) : "—"} />
        <Stat label="Total Cost" value={s ? formatInr(s.costInr) : "—"} />
        <Stat label="Net Margin" value={s ? formatInr(s.netMarginInr) : "—"} />
        <Stat label="Avg Margin %" value={s ? `${s.avgMarginPct.toFixed(0)}%` : "—"} />
      </div>

      <Card className="mt-3 overflow-auto p-4">
        <table className="w-full whitespace-nowrap text-[12px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Emp ID</th><th>Department</th><th>Clients</th><th>Services</th><th>Revenue (₹)</th><th>50% Allotted (₹)</th><th>Cost (₹)</th><th>Surplus (₹)</th><th>Margin %</th></tr></thead>
          <tbody>
            {data?.data.length === 0 && <tr><td colSpan={10} className="py-4 text-center text-[#94A3B8]">No billable resources.</td></tr>}
            {data?.data.map((r) => (
              <tr key={r.resourceId} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${r.resourceId}`)}>
                <td className="py-2 font-medium">{r.resource}</td>
                <td className="font-mono text-[11px] text-[#94A3B8]">{r.employeeNumber}</td>
                <td>{r.department}</td><td>{r.clients}</td><td><CodeBadges codes={r.services} /></td>
                <td>{formatInr(r.revenueInr)}</td><td>{formatInr(r.allottedInr)}</td><td>{formatInr(r.costInr)}</td>
                <td className={surplusColor(r.surplusInr)}>{formatInr(r.surplusInr)}</td><td>{r.marginPct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
