"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { StatusPills } from "@/components/common/StatusPills";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Money } from "@/components/common/CurrencyDisplay";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useReference } from "@/hooks/useReference";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatUsd, formatDate } from "@/lib/utils";

type Row = { id: string; employeeNumber: string; name: string; title: string; department: string; costCentre: string; joinedDate: string; status: string; isBillable: boolean; baseSalary: number; incentive: number; allowance: number; overhead: number; laptopAmortised: number; toolCostInr: number; totalCostInr: number; totalCostUsd: number; revenueShareInr: number; grossMarginInr: number; grossMarginUsd: number; marginPct: number; utilisationPct: number };
type Assign = { resourceId: string; resource: string; clientId: string; client: string; serviceCode: string; packageType: string; monthlyFeeUsd: number; assignedFrom: string; assignedTo: string | null; revenueShareInr: number; utilisationPct: number; fullyLoadedInr: number; revenueUtilPct: number; status: string };
type Data = { kpi: { salaryInr: number; fullyLoadedInr: number; revShareInr: number; avgMarginPct: number }; rows: Row[]; assignments: Assign[]; assignKpi: { total: number; clients: number; revShareInr: number; avgUtilPct: number } };

/** Revenue utilisation = revShare / fully-loaded cost. ≥100 green, 70–99 amber, <70 red. */
function RevUtilBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "#1D9E75" : pct >= 70 ? "#BA7517" : "#D85A30";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F1F5F9]"><div style={{ width: `${Math.min(100, pct)}%`, background: color }} className="h-full" /></div>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function ResourceAnalyticsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data: ref } = useReference();
  const [status, setStatus] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [billable, setBillable] = React.useState("");
  const { data } = useSWR<Data>(`/api/analytical/resources?year=${periodYear}&month=${periodMonth}&departmentId=${departmentId}&status=${status}&billable=${billable}`, apiGet);
  const k = data?.kpi;
  const ak = data?.assignKpi;

  return (
    <PageShell
      title="Resource Analysis"
      filterBar={
        <FilterBar>
          <FilterSelect value={departmentId} onChange={setDepartmentId} placeholder="All Departments" options={(ref?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
          <StatusPills value={status} onChange={setStatus} options={[{ value: "", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "TERMED", label: "Termed" }]} />
          <StatusPills value={billable} onChange={setBillable} options={[{ value: "", label: "All" }, { value: "true", label: "Billable" }, { value: "false", label: "Non-billable" }]} />
        </FilterBar>
      }
    >
      <Tabs defaultValue="resources" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="resources">Resource Analysis</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total Salary Cost (INR)" value={k ? formatInr(k.salaryInr) : "—"} />
            <KpiCard label="Fully-Loaded Cost (INR)" value={k ? formatInr(k.fullyLoadedInr) : "—"} />
            <KpiCard label="Total Rev Share (INR)" value={k ? formatInr(k.revShareInr) : "—"} />
            <KpiCard label="Avg Margin %" value={k ? `${k.avgMarginPct.toFixed(0)}%` : "—"} />
          </div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[11px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Dept</th><th>Cost Centre</th><th>Title</th><th>Join</th><th>Status</th><th>Billable</th><th>Base</th><th>Incentive</th><th>Allowance</th><th>Overhead</th><th>Laptop/mo</th><th>Tool</th><th>Total Cost</th><th>Rev Share</th><th>Gross Margin</th><th>Margin %</th><th>Util %</th></tr></thead>
                <tbody>
                  {data?.rows.map((r) => (
                    <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${r.id}`)}>
                      <td className="py-2 font-medium">{r.name}</td><td>{r.department}</td><td>{r.costCentre}</td><td>{r.title}</td>
                      <td>{formatDate(r.joinedDate)}</td><td><StatusBadge status={r.status} /></td><td><Badge tone={r.isBillable ? "success" : "neutral"}>{r.isBillable ? "Yes" : "No"}</Badge></td>
                      <td>{formatInr(r.baseSalary)}</td><td>{formatInr(r.incentive)}</td><td>{formatInr(r.allowance)}</td><td>{formatInr(r.overhead)}</td><td>{formatInr(r.laptopAmortised)}</td><td>{formatInr(r.toolCostInr)}</td>
                      <td><Money inr={r.totalCostInr} usd={r.totalCostUsd} primary="INR" /></td>
                      <td>{formatInr(r.revenueShareInr)}</td>
                      <td><Money inr={r.grossMarginInr} usd={r.grossMarginUsd} primary="INR" negativeColors /></td>
                      <td>{r.marginPct.toFixed(0)}%</td><td>{r.utilisationPct.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total Assignments" value={ak ? String(ak.total) : "—"} />
            <KpiCard label="Distinct Clients" value={ak ? String(ak.clients) : "—"} />
            <KpiCard label="Total Rev Share (INR)" value={ak ? formatInr(ak.revShareInr) : "—"} />
            <KpiCard label="Avg Util %" value={ak ? `${ak.avgUtilPct.toFixed(0)}%` : "—"} />
          </div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[11px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Client</th><th>Service</th><th>Package</th><th>From</th><th>To</th><th>Monthly Fee ($)</th><th>Rev Share (INR)</th><th>Util %</th><th>Revenue Utilisation</th><th>Status</th></tr></thead>
                <tbody>
                  {data?.assignments.map((a, i) => (
                    <tr key={i} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${a.clientId}`)}>
                      <td className="py-2 font-medium">{a.resource}</td><td>{a.client}</td><td className="font-mono text-[10px]">{a.serviceCode}</td>
                      <td>{a.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td><td>{formatDate(a.assignedFrom)}</td><td>{formatDate(a.assignedTo)}</td>
                      <td>{formatUsd(a.monthlyFeeUsd)}</td><td>{formatInr(a.revenueShareInr)}</td><td>{a.utilisationPct.toFixed(0)}%</td><td><RevUtilBar pct={a.revenueUtilPct} /></td><td><StatusBadge status={a.status} /></td>
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
