"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Money } from "@/components/common/CurrencyDisplay";
import { CategoryBadge, CodeBadges, StatusBadge } from "@/components/common/StatusBadge";
import { useReference } from "@/hooks/useReference";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatUsd } from "@/lib/utils";

const PIE = ["#3266AD", "#1D9E75", "#7F77DD", "#BA7517", "#D4537E", "#D85A30"];

type Dept = { id: string; name: string; category: string; head: string | null; activeResources: number; services: string[]; revenueInr: number; revenueUsd: number; deptReserveInr: number; workforceCostInr: number; workforceCostUsd: number; toolCostInr: number; totalDeptCostInr: number; totalDeptCostUsd: number; surplusInr: number; surplusUsd: number; marginPct: number };
type Data = {
  kpi: { revenueInr: number; costInr: number; reserveInr: number; surplusInr: number };
  rows: Dept[];
  charts: { costRevChart: { name: string; cost: number; revenue: number }[]; workforceSplit: { name: string; value: number }[] };
  breakdown: { clientId: string; client: string; billingType: string; serviceCode: string; departmentName: string; packageType: string; monthlyFeeUsd: number; netRevenueInr: number; deptShareInr: number; period: string; status: string }[];
};

export default function DeptAnalyticsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data: ref } = useReference();
  const [departmentId, setDepartmentId] = React.useState("");
  const { data } = useSWR<Data>(`/api/analytical/departments?year=${periodYear}&month=${periodMonth}&departmentId=${departmentId}`, apiGet);
  const k = data?.kpi;

  return (
    <PageShell
      title="Department Analysis"
      filterBar={<FilterBar><FilterSelect value={departmentId} onChange={setDepartmentId} placeholder="All Departments" options={(ref?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} /></FilterBar>}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total Dept Revenue (INR)" value={k ? formatInr(k.revenueInr) : "—"} />
        <KpiCard label="Total Dept Cost (INR)" value={k ? formatInr(k.costInr) : "—"} />
        <KpiCard label="Total Reserve Budget (INR)" value={k ? formatInr(k.reserveInr) : "—"} />
        <KpiCard label="Aggregate Surplus/(Deficit)" value={k ? formatInr(k.surplusInr) : "—"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle>Cost vs Revenue by Department</SectionTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.costRevChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={60} tickFormatter={(x) => `₹${(x / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#0F1629", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} formatter={(x: number) => formatInr(x)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#3266AD" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#D85A30" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle>Workforce Cost Split</SectionTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.charts.workforceSplit ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {data?.charts.workforceSplit.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0F1629", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} formatter={(x: number) => formatInr(x)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-auto p-4">
        <SectionTitle>Department P&amp;L</SectionTitle>
        <table className="mt-2 w-full whitespace-nowrap text-[11px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Department</th><th>Category</th><th>Head</th><th>Resources</th><th>Services</th><th>Revenue</th><th>Reserve 50%</th><th>Workforce Cost</th><th>Tool Cost</th><th>Total Cost</th><th>Surplus</th><th>Margin %</th></tr></thead>
          <tbody>
            {data?.rows.map((d) => (
              <tr key={d.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/departments/${d.id}`)}>
                <td className="py-2 font-medium">{d.name}</td><td><CategoryBadge category={d.category} /></td><td>{d.head ?? "—"}</td><td>{d.activeResources}</td>
                <td><CodeBadges codes={d.services} /></td>
                <td><Money inr={d.revenueInr} usd={d.revenueUsd} primary="INR" /></td>
                <td>{formatInr(d.deptReserveInr)}</td>
                <td><Money inr={d.workforceCostInr} usd={d.workforceCostUsd} primary="INR" /></td>
                <td>{formatInr(d.toolCostInr)}</td>
                <td><Money inr={d.totalDeptCostInr} usd={d.totalDeptCostUsd} primary="INR" /></td>
                <td><Money inr={d.surplusInr} usd={d.surplusUsd} primary="INR" negativeColors /></td>
                <td>{d.marginPct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-auto p-4">
        <SectionTitle>Client-Service Breakdown</SectionTitle>
        <table className="mt-2 w-full whitespace-nowrap text-[11px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Client</th><th>Billing</th><th>Service</th><th>Department</th><th>Package</th><th>Monthly Fee ($)</th><th>Net Revenue (INR)</th><th>Dept Share (INR)</th><th>Period</th><th>Status</th></tr></thead>
          <tbody>
            {data?.breakdown.map((b, i) => (
              <tr key={i} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${b.clientId}`)}>
                <td className="py-2 font-medium">{b.client}</td><td>{b.billingType}</td><td className="font-mono text-[10px]">{b.serviceCode}</td><td>{b.departmentName}</td>
                <td>{b.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td><td>{formatUsd(b.monthlyFeeUsd)}</td><td>{formatInr(b.netRevenueInr)}</td><td>{formatInr(b.deptShareInr)}</td>
                <td>{b.period}</td><td><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PageShell>
  );
}
