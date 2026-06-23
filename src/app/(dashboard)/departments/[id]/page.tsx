"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/common/KpiCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CategoryBadge, CodeBadges, StatusBadge } from "@/components/common/StatusBadge";
import { UtilBar } from "@/components/common/UtilBar";
import { DepartmentForm } from "@/components/departments/DepartmentForm";
import { apiGet } from "@/lib/api-client";
import * as React from "react";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatUsd } from "@/lib/utils";

type Detail = {
  id: string; name: string; category: string;
  head: { id: string; name: string } | null;
  costCentres: { id: string; name: string }[];
  services: { id: string; code: string; name: string; activities: number; activeClients: number }[];
  resources: { id: string; name: string; title: string; costCentre: string; isBillable: boolean; services: string[]; baseSalary: number; totalCostInr: number; utilisationPct: number; status: string }[];
  pnl: {
    kpi: { revenueInr: number; deptReserveInr: number; workforceCostInr: number; totalDeptCostInr: number; surplusInr: number };
    clientBreakdown: { clientId: string; client: string; serviceCode: string; packageType: string; monthlyFeeUsd: number; netRevenueInr: number; deptShareInr: number; period: string; status: string }[];
    monthly: { month: string; revenueInr: number; reserveInr: number; workforceCostInr: number; toolCostInr: number; totalCostInr: number; surplusInr: number }[];
  };
};

export default function DepartmentDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, mutate } = useSWR<{ data: Detail }>(`/api/departments/${params.id}?year=${periodYear}&month=${periodMonth}`, apiGet);
  const d = data?.data;
  const k = d?.pnl.kpi;
  const [editOpen, setEditOpen] = React.useState(false);

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/departments")}><ArrowLeft size={14} /> Departments</Button>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-[22px] font-bold text-[#0F1629]">{d?.name ?? "…"}</h1>
        {d && <CategoryBadge category={d.category} />}
        <div className="ml-auto"><Button variant="secondary" onClick={() => setEditOpen(true)}>Edit Department</Button></div>
      </div>
      {d && <DepartmentForm open={editOpen} onOpenChange={setEditOpen} editing={{ id: d.id, name: d.name, category: d.category, headId: d.head?.id ?? null }} onSaved={() => mutate()} />}

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pnl">P&amp;L</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {(() => {
            const surplus = k?.surplusInr ?? 0;
            const statusLabel = surplus > 0 ? "Profitable" : surplus < 0 ? "Loss" : "Break-even";
            const statusTone = surplus > 0 ? "success" : surplus < 0 ? "error" : "neutral";
            const billableCount = (d?.resources ?? []).filter((r) => r.isBillable).length;
            return (
              <>
                <div className="grid gap-3 lg:grid-cols-3">
                  <Card className="p-4"><SectionTitle>Head</SectionTitle><p className="mt-1.5 text-[14px] font-medium">{d?.head?.name ?? "—"}</p></Card>
                  <Card className="p-4"><SectionTitle>Category</SectionTitle><div className="mt-1.5">{d && <CategoryBadge category={d.category} />}</div></Card>
                  <Card className="p-4"><SectionTitle>Status</SectionTitle><div className="mt-1.5"><Badge tone={statusTone}>{statusLabel}</Badge></div></Card>
                  <Card className="p-4"><SectionTitle>Resources</SectionTitle><p className="mt-1.5 text-[13px] text-[#64748B]">{d?.resources.length ?? 0} total · {billableCount} billable</p></Card>
                  <Card className="p-4"><SectionTitle>Services</SectionTitle><div className="mt-1.5"><CodeBadges codes={(d?.services ?? []).map((s) => s.code)} /></div></Card>
                  <Card className="p-4"><SectionTitle>Cost Centres</SectionTitle><p className="mt-1.5 text-[13px] text-[#64748B]">{d?.costCentres.map((c) => c.name).join(", ") || "—"}</p></Card>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                  <KpiCard label="Revenue (₹)" value={k ? formatInr(k.revenueInr) : "—"} />
                  <KpiCard label="Cost (₹)" value={k ? formatInr(k.totalDeptCostInr) : "—"} />
                  <KpiCard label="Surplus/(Deficit) (₹)" value={k ? formatInr(k.surplusInr) : "—"} />
                </div>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="pnl">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total Cost" value={k ? formatInr(k.totalDeptCostInr) : "—"} />
            <KpiCard label="Workforce Cost" value={k ? formatInr(k.workforceCostInr) : "—"} />
            <KpiCard label="Tool / Client Cost" value={k ? formatInr(Math.max(0, k.totalDeptCostInr - k.workforceCostInr)) : "—"} />
            <KpiCard label="Reserve Budget" value={k ? formatInr(k.deptReserveInr) : "—"} />
          </div>

          <Card className="mt-3 p-4">
            <SectionTitle>Monthly P&amp;L</SectionTitle>
            <table className="mt-2 w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Revenue</th><th>Reserve Budget</th><th>Workforce Cost</th><th>Tool Cost</th><th>Total Cost</th><th>Surplus/(Deficit)</th></tr></thead>
              <tbody>
                {d?.pnl.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-[#E8ECF4]">
                    <td className="py-2">{m.month}</td><td>{formatInr(m.revenueInr)}</td><td>{formatInr(m.reserveInr)}</td>
                    <td>{formatInr(m.workforceCostInr)}</td><td>{formatInr(m.toolCostInr)}</td><td>{formatInr(m.totalCostInr)}</td>
                    <td className={m.surplusInr < 0 ? "text-[#D85A30]" : "text-[#1D9E75]"}>{formatInr(m.surplusInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard label="Revenue Generated" value={k ? formatInr(k.revenueInr) : "—"} />
            <KpiCard label="Dept Reserve 50%" value={k ? formatInr(k.deptReserveInr) : "—"} />
            <KpiCard label="Clients / Services" value={String(new Set((d?.pnl.clientBreakdown ?? []).map((b) => b.clientId)).size)} />
          </div>
          <Card className="mt-3 p-4">
            <SectionTitle>Revenue Breakdown</SectionTitle>
            <div className="mt-2 max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Client</th><th>Service</th><th>Package</th><th>Monthly Fee ($)</th><th>Net Revenue (₹)</th><th>Dept Share (₹)</th><th>Period</th><th>Status</th></tr></thead>
                <tbody>
                  {d?.pnl.clientBreakdown.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-[#94A3B8]">No revenue for this period.</td></tr>}
                  {d?.pnl.clientBreakdown.map((b, i) => (
                    <tr key={i} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${b.clientId}`)}>
                      <td className="py-2 font-medium">{b.client}</td><td className="font-mono text-[11px]">{b.serviceCode}</td>
                      <td>{b.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td><td>{formatUsd(b.monthlyFeeUsd)}</td>
                      <td>{formatInr(b.netRevenueInr)}</td><td>{formatInr(b.deptShareInr)}</td><td>{b.period}</td><td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Title</th><th>Cost Centre</th><th>Billable</th><th>Services</th><th>Base Salary</th><th>Total Cost</th><th>Util %</th><th>Status</th></tr></thead>
              <tbody>
                {d?.resources.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${r.id}`)}>
                    <td className="py-2 font-medium">{r.name}</td><td>{r.title}</td><td>{r.costCentre}</td>
                    <td>{r.isBillable ? "✓" : "—"}</td><td><CodeBadges codes={r.services} /></td>
                    <td>{formatInr(r.baseSalary)}</td><td>{formatInr(r.totalCostInr)}</td>
                    <td><UtilBar pct={r.utilisationPct} /></td><td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Code</th><th>Service Name</th><th>Active Clients</th><th>Activities</th></tr></thead>
              <tbody>
                {d?.services.map((s) => (
                  <tr key={s.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/services/${s.id}`)}>
                    <td className="py-2 font-mono text-[11px]">{s.code}</td><td>{s.name}</td><td>{s.activeClients}</td><td>{s.activities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
