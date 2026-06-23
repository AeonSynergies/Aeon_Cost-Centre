"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Money } from "@/components/common/CurrencyDisplay";
import { CategoryBadge, CodeBadges, StatusBadge } from "@/components/common/StatusBadge";
import { StatusPills } from "@/components/common/StatusPills";
import { useReference } from "@/hooks/useReference";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatUsd } from "@/lib/utils";

type Dept = { id: string; name: string; category: string; head: string | null; activeResources: number; services: string[]; revenueInr: number; revenueUsd: number; deptReserveInr: number; workforceCostInr: number; workforceCostUsd: number; toolCostInr: number; totalDeptCostInr: number; totalDeptCostUsd: number; surplusInr: number; surplusUsd: number; marginPct: number };
type Breakdown = { clientId: string; client: string; billingType: string; serviceCode: string; departmentName: string; packageType: string; monthlyFeeUsd: number; netRevenueInr: number; deptShareInr: number; period: string; status: string };
type Data = {
  kpi: { revenueInr: number; costInr: number; reserveInr: number; surplusInr: number };
  rows: Dept[];
  breakdown: Breakdown[];
};

export default function DeptAnalyticsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data: ref } = useReference();
  const [departmentId, setDepartmentId] = React.useState("");
  const [bdStatus, setBdStatus] = React.useState("ACTIVE");
  const { data } = useSWR<Data>(`/api/analytical/departments?year=${periodYear}&month=${periodMonth}&departmentId=${departmentId}`, apiGet);
  const k = data?.kpi;

  const bdAll = data?.breakdown ?? [];
  const bd = bdAll.filter((b) => !bdStatus || b.status === bdStatus);
  const clientSet = new Set(bd.map((b) => b.clientId));
  const csKpi = {
    activeClients: clientSet.size,
    serviceRevenueUsd: bd.reduce((s, b) => s + b.monthlyFeeUsd, 0),
    netRevenueInr: bd.reduce((s, b) => s + b.netRevenueInr, 0),
    avgPerClientUsd: clientSet.size ? bd.reduce((s, b) => s + b.monthlyFeeUsd, 0) / clientSet.size : 0,
  };

  return (
    <PageShell
      title="Department Analysis"
      filterBar={<FilterBar><FilterSelect value={departmentId} onChange={setDepartmentId} placeholder="All Departments" options={(ref?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} /></FilterBar>}
    >
      <Tabs defaultValue="pnl" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="pnl">Department P&amp;L</TabsTrigger>
          <TabsTrigger value="breakdown">Client-Service Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total Dept Revenue (INR)" value={k ? formatInr(k.revenueInr) : "—"} />
            <KpiCard label="Total Dept Cost (INR)" value={k ? formatInr(k.costInr) : "—"} />
            <KpiCard label="Total Reserve Budget (INR)" value={k ? formatInr(k.reserveInr) : "—"} />
            <KpiCard label="Aggregate Surplus/(Deficit)" value={k ? formatInr(k.surplusInr) : "—"} />
          </div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[11px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Department</th><th>Category</th><th>Head</th><th>Resources</th><th>Services</th><th>Revenue</th><th>Reserve 50%</th><th>Workforce Cost</th><th>Tool Cost</th><th>Total Cost</th><th>Surplus</th><th>Margin %</th></tr></thead>
                <tbody>
                  {data?.rows.map((d) => (
                    <tr key={d.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/departments/${d.id}`)}>
                      <td className="py-2 font-medium">{d.name}</td><td><CategoryBadge category={d.category} /></td><td>{d.head ?? "—"}</td><td>{d.activeResources}</td>
                      <td><CodeBadges codes={d.services} /></td>
                      <td><Money inr={d.revenueInr} usd={d.revenueUsd} primary="INR" /></td>
                      <td><div className="text-[13px] font-semibold tabular-nums text-[#0F1629]">{formatInr(d.deptReserveInr)}</div></td>
                      <td><Money inr={d.workforceCostInr} usd={d.workforceCostUsd} primary="INR" /></td>
                      <td>{formatInr(d.toolCostInr)}</td>
                      <td><Money inr={d.totalDeptCostInr} usd={d.totalDeptCostUsd} primary="INR" /></td>
                      <td><Money inr={d.surplusInr} usd={d.surplusUsd} primary="INR" negativeColors /></td>
                      <td>{d.marginPct.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="mb-3">
            <StatusPills value={bdStatus} onChange={setBdStatus} options={[{ value: "", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "CHURNED", label: "Churned" }]} />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Active Clients" value={csKpi.activeClients} />
            <KpiCard label="Total Service Revenue ($)" value={formatUsd(csKpi.serviceRevenueUsd)} />
            <KpiCard label="Total Net Revenue (INR)" value={formatInr(csKpi.netRevenueInr)} />
            <KpiCard label="Avg per Client ($)" value={formatUsd(csKpi.avgPerClientUsd)} />
          </div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[11px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Client</th><th>Billing</th><th>Service</th><th>Department</th><th>Package</th><th>Monthly Fee ($)</th><th>Net Revenue (INR)</th><th>Dept Share (INR)</th><th>Period</th><th>Status</th></tr></thead>
                <tbody>
                  {bd.map((b, i) => (
                    <tr key={i} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${b.clientId}`)}>
                      <td className="py-2 font-medium">{b.client}</td><td>{b.billingType}</td><td className="font-mono text-[10px]">{b.serviceCode}</td><td>{b.departmentName}</td>
                      <td>{b.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td><td>{formatUsd(b.monthlyFeeUsd)}</td><td>{formatInr(b.netRevenueInr)}</td><td>{formatInr(b.deptShareInr)}</td>
                      <td>{b.period}</td><td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
