"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Switch } from "@/components/ui/switch";
import { Money } from "@/components/common/CurrencyDisplay";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useReference } from "@/hooks/useReference";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatUsd, formatDate } from "@/lib/utils";

type Row = { id: string; employeeNumber: string; name: string; title: string; department: string; costCentre: string; joinedDate: string; status: string; isBillable: boolean; baseSalary: number; incentive: number; allowance: number; overhead: number; laptopAmortised: number; toolCostInr: number; totalCostInr: number; totalCostUsd: number; revenueShareInr: number; grossMarginInr: number; grossMarginUsd: number; marginPct: number; utilisationPct: number };
type Assign = { resourceId: string; resource: string; clientId: string; client: string; serviceCode: string; packageType: string; monthlyFeeUsd: number; assignedFrom: string; assignedTo: string | null; revenueShareInr: number; utilisationPct: number; status: string };
type Data = { kpi: { salaryInr: number; fullyLoadedInr: number; revShareInr: number; avgMarginPct: number }; rows: Row[]; assignments: Assign[] };

export default function ResourceAnalyticsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data: ref } = useReference();
  const [status, setStatus] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [billable, setBillable] = React.useState(false);
  const { data } = useSWR<Data>(`/api/analytical/resources?year=${periodYear}&month=${periodMonth}&departmentId=${departmentId}&status=${status}&billable=${billable}`, apiGet);
  const k = data?.kpi;

  return (
    <PageShell
      title="Resource Analysis"
      filterBar={
        <FilterBar>
          <FilterSelect value={status} onChange={setStatus} placeholder="All Status" options={[{ value: "ACTIVE", label: "Active" }, { value: "TERMED", label: "Termed" }]} />
          <FilterSelect value={departmentId} onChange={setDepartmentId} placeholder="All Departments" options={(ref?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
          <label className="flex items-center gap-1.5 text-[12px] text-[#64748B]"><Switch checked={billable} onCheckedChange={setBillable} /> Billable only</label>
        </FilterBar>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total Salary Cost (INR)" value={k ? formatInr(k.salaryInr) : "—"} />
        <KpiCard label="Fully-Loaded Cost (INR)" value={k ? formatInr(k.fullyLoadedInr) : "—"} />
        <KpiCard label="Total Rev Share (INR)" value={k ? formatInr(k.revShareInr) : "—"} />
        <KpiCard label="Avg Margin %" value={k ? `${k.avgMarginPct.toFixed(0)}%` : "—"} />
      </div>

      <Card className="overflow-auto p-4">
        <SectionTitle>Resource Analysis</SectionTitle>
        <table className="mt-2 w-full whitespace-nowrap text-[11px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Emp ID</th><th>Dept</th><th>Cost Centre</th><th>Title</th><th>Join</th><th>Status</th><th>Billable</th><th>Base</th><th>Incentive</th><th>Allowance</th><th>Overhead</th><th>Laptop/mo</th><th>Tool</th><th>Total Cost</th><th>Rev Share</th><th>Gross Margin</th><th>Margin %</th><th>Util %</th></tr></thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${r.id}`)}>
                <td className="py-2 font-medium">{r.name}</td><td className="font-mono text-[10px] text-[#94A3B8]">{r.employeeNumber}</td><td>{r.department}</td><td>{r.costCentre}</td><td>{r.title}</td>
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
      </Card>

      <Card className="overflow-auto p-4">
        <SectionTitle>Assignment Detail</SectionTitle>
        <table className="mt-2 w-full whitespace-nowrap text-[11px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Client</th><th>Service</th><th>Package</th><th>From</th><th>To</th><th>Monthly Fee ($)</th><th>Rev Share (INR)</th><th>Util %</th><th>Status</th></tr></thead>
          <tbody>
            {data?.assignments.map((a, i) => (
              <tr key={i} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${a.clientId}`)}>
                <td className="py-2 font-medium">{a.resource}</td><td>{a.client}</td><td className="font-mono text-[10px]">{a.serviceCode}</td>
                <td>{a.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td><td>{formatDate(a.assignedFrom)}</td><td>{formatDate(a.assignedTo)}</td>
                <td>{formatUsd(a.monthlyFeeUsd)}</td><td>{formatInr(a.revenueShareInr)}</td><td>{a.utilisationPct.toFixed(0)}%</td><td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PageShell>
  );
}
