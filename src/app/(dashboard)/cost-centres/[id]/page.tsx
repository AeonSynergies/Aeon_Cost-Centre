"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge, CategoryBadge } from "@/components/common/StatusBadge";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatDate } from "@/lib/utils";

type Detail = {
  id: string;
  name: string;
  resources: { id: string; name: string; title: string; department: { id: string; name: string }; isBillable: boolean; baseSalary: number; totalCostInr: number; status: string }[];
  departments: { id: string; name: string; category: string; resourceCount: number; costInr: number }[];
  expenses: { id: string; periodYear: number; periodMonth: number; category: string; description: string; amountInr: number | null; amountUsd: number | null; currency: string }[];
  kpi: { resourceCount: number; departmentCount: number; expensesInr: number; resourceCostInr: number; totalCostInr: number };
};

export default function CostCentreDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data } = useSWR<{ data: Detail }>(`/api/cost-centres/${params.id}?year=${periodYear}&month=${periodMonth}`, apiGet);
  const d = data?.data;

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/cost-centres")}><ArrowLeft size={14} /> Cost Centres</Button>
      <h1 className="mt-2 text-[22px] font-bold text-[#0F1629]">{d?.name ?? "…"}</h1>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiCard label="Resources" value={d?.kpi.resourceCount ?? "—"} />
            <KpiCard label="Departments" value={d?.kpi.departmentCount ?? "—"} />
            <KpiCard label="Total Expenses" value={d ? formatInr(d.kpi.expensesInr) : "—"} />
            <KpiCard label="Resource Cost" value={d ? formatInr(d.kpi.resourceCostInr) : "—"} />
            <KpiCard label="Total Cost" value={d ? formatInr(d.kpi.totalCostInr) : "—"} />
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Department</th><th>Title</th><th>Base Salary</th><th>Total Cost</th><th>Status</th></tr></thead>
              <tbody>
                {d?.resources.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${r.id}`)}>
                    <td className="py-2 font-medium">{r.name}</td><td>{r.department.name}</td><td>{r.title}</td>
                    <td>{formatInr(r.baseSalary)}</td><td>{formatInr(r.totalCostInr)}</td><td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Department</th><th>Category</th><th>Resource Count</th><th>Cost Allocated</th></tr></thead>
              <tbody>
                {d?.departments.map((dep) => (
                  <tr key={dep.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/departments/${dep.id}`)}>
                    <td className="py-2 font-medium">{dep.name}</td><td><CategoryBadge category={dep.category} /></td>
                    <td>{dep.resourceCount}</td><td>{formatInr(dep.costInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Category</th><th>Description</th><th>Amount (₹)</th><th>Currency</th></tr></thead>
              <tbody>
                {d?.expenses.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-[#94A3B8]">No expenses for this period.</td></tr>}
                {d?.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-[#E8ECF4]">
                    <td className="py-2">{e.periodMonth}/{e.periodYear}</td><td>{e.category}</td><td>{e.description}</td>
                    <td>{formatInr(e.amountInr ?? 0)}</td><td>{e.currency}</td>
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
