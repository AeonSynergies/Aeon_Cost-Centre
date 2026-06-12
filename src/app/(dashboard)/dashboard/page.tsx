"use client";

import * as React from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { DollarSign, TrendingUp, Wallet, PiggyBank, Users, Briefcase, UserCog, Boxes, ArrowRight, Gauge } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatUsd, formatInr, formatPeriod } from "@/lib/utils";

type Overview = {
  financial: { totalServiceCostUsd: number; grossRevenueUsd: number; netRevenueUsd: number; netRevenueInr: number; totalExpensesInr: number; netProfitInr: number; abbieRoyaltyUsd: number; reserveFundUsd: number };
  operations: { activeClients: number; mrrUsd: number; activeResources: number; billableResources: number };
  cost: { salaryInr: number; fullyLoadedInr: number; toolInr: number; overheadInr: number };
  charts: {
    revVsExp: { month: string; revenue: number; expenses: number; future: boolean }[];
    allocation: { totalInr: number; segments: { name: string; value: number; color: string }[] };
    costRevByDept: { name: string; cost: number; revenue: number }[];
    workforceSplit: { name: string; value: number; color: string }[];
    costByCostCentre: { name: string; salary: number; tool: number; overhead: number }[];
    salaryTrend: { month: string; salary: number; future: boolean }[];
  };
  capacity: { avgUtilPct: number; overCap: number; underUtil: number; healthy: number; perResource: { id: string; name: string; pct: number }[] };
  deptPnl: { id: string; name: string; resources: number; costInr: number; surplusInr: number }[];
  topClients: { id: string; name: string; services: string[]; monthlyFeeUsd: number; netRevenueInr: number }[];
  alerts: { id: string; name: string; department: string; utilisationPct: number; status: string }[];
};

function KCard({ icon, accent, label, value, sub }: { icon: React.ReactNode; accent: string; label: string; value: string; sub?: string }) {
  return (
    <Card className="border-b-2 p-4 transition-all duration-150 hover:-translate-y-px hover:shadow-md" style={{ borderBottomColor: accent }}>
      <div className="flex h-7 w-7 items-center justify-center rounded-[7px]" style={{ background: `${accent}1A`, color: accent }}>{icon}</div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</div>
      <div className="text-[20px] font-bold tabular-nums text-[#0F1629]">{value}</div>
      {sub && <div className="text-[10px] text-[#94A3B8]">{sub}</div>}
    </Card>
  );
}

function statusBadge(status: string) {
  if (status === "OVER_CAPACITY") return <Badge tone="error">Over</Badge>;
  if (status === "HEALTHY") return <Badge tone="success">Healthy</Badge>;
  if (status === "UNDER_UTILISED") return <Badge tone="warning">Under</Badge>;
  return <Badge tone="error">Low</Badge>;
}

const tooltipStyle = { background: "#0F1629", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 };

export default function DashboardPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data } = useSWR<Overview>(`/api/dashboard/overview?year=${periodYear}&month=${periodMonth}`, apiGet);
  const f = data?.financial; const o = data?.operations; const c = data?.cost; const cap = data?.capacity;
  const sub = `${formatPeriod(periodYear, periodMonth)} · all active clients`;
  const v = (x: number | undefined, fmt: (n: number) => string = formatInr) => (x === undefined ? "—" : fmt(x));

  return (
    <PageShell title="Dashboard" filterBar={<FilterBar />}>
      <Tabs defaultValue="financial" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
        </TabsList>

        {/* ---- Financial ---- */}
        <TabsContent value="financial">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KCard icon={<DollarSign size={15} />} accent="#3266AD" label="Total Service Cost ($)" value={v(f?.totalServiceCostUsd, formatUsd)} sub={sub} />
            <KCard icon={<TrendingUp size={15} />} accent="#1D9E75" label="Gross Revenue ($)" value={v(f?.grossRevenueUsd, formatUsd)} sub={sub} />
            <KCard icon={<TrendingUp size={15} />} accent="#1D9E75" label="Net Revenue (USD)" value={v(f?.netRevenueUsd, formatUsd)} sub={sub} />
            <KCard icon={<TrendingUp size={15} />} accent="#3266AD" label="Net Revenue (INR)" value={v(f?.netRevenueInr)} sub={sub} />
            <KCard icon={<Wallet size={15} />} accent="#D85A30" label="Total Expenses (INR)" value={v(f?.totalExpensesInr)} sub={sub} />
            <KCard icon={<PiggyBank size={15} />} accent={f && f.netProfitInr < 0 ? "#D85A30" : "#1D9E75"} label="Net Profit/(Loss) (INR)" value={v(f?.netProfitInr)} sub={sub} />
            <KCard icon={<DollarSign size={15} />} accent="#7F77DD" label="Abbie Royalty ($)" value={v(f?.abbieRoyaltyUsd, formatUsd)} sub={sub} />
            <KCard icon={<PiggyBank size={15} />} accent="#BA7517" label="Reserve Fund ($)" value={v(f?.reserveFundUsd, formatUsd)} sub={sub} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            <Card className="p-4 lg:col-span-3">
              <SectionTitle>Revenue vs Expenses</SectionTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.charts.revVsExp ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={66} tickFormatter={(x) => `₹${(x / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(x: number) => formatInr(x)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#3266AD" radius={[3, 3, 0, 0]} />
                    <Line dataKey="expenses" name="Expenses" stroke="#D85A30" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 lg:col-span-2">
              <SectionTitle>Revenue Allocation</SectionTitle>
              <div className="relative mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.charts.allocation.segments ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {data?.charts.allocation.segments.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(x: number) => formatInr(x)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ---- Operations ---- */}
        <TabsContent value="operations">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KCard icon={<Briefcase size={15} />} accent="#3266AD" label="Active Clients" value={o ? String(o.activeClients) : "—"} sub={sub} />
            <KCard icon={<DollarSign size={15} />} accent="#1D9E75" label="MRR (USD)" value={v(o?.mrrUsd, formatUsd)} sub={sub} />
            <KCard icon={<UserCog size={15} />} accent="#7F77DD" label="Active Resources" value={o ? String(o.activeResources) : "—"} sub={sub} />
            <KCard icon={<Users size={15} />} accent="#D4537E" label="Billable Resources" value={o ? String(o.billableResources) : "—"} sub={sub} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <SectionTitle>Cost vs Revenue by Department</SectionTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.charts.costRevByDept ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={66} tickFormatter={(x) => `₹${(x / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(x: number) => formatInr(x)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#1D9E75" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cost" name="Cost" fill="#D85A30" radius={[3, 3, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>Workforce Cost Split</SectionTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.charts.workforceSplit ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {data?.charts.workforceSplit.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(x: number) => formatInr(x)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center justify-between"><SectionTitle>Top Clients by Revenue</SectionTitle><Link href="/clients" className="flex items-center gap-1 text-[11px] text-[#3266AD]">View all <ArrowRight size={11} /></Link></div>
              <div className="mt-2 space-y-1.5">
                {data?.topClients.map((cl, i) => (
                  <div key={cl.id} className="flex cursor-pointer items-center justify-between text-[12px] hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${cl.id}`)}>
                    <span className="flex items-center gap-2"><span className="flex h-4 w-4 items-center justify-center rounded bg-[#E6F1FB] text-[9px] font-bold text-[#3266AD]">{i + 1}</span>{cl.name}</span>
                    <span className="tabular-nums text-[#1D9E75]">{formatInr(cl.netRevenueInr)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between"><SectionTitle>Department P&amp;L</SectionTitle><Link href="/analytical/departments" className="flex items-center gap-1 text-[11px] text-[#3266AD]">View full <ArrowRight size={11} /></Link></div>
              <div className="mt-2 space-y-1.5">
                {data?.deptPnl.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-[12px]">
                    <span className="font-medium">{d.name} <span className="text-[#94A3B8]">· {d.resources}</span></span>
                    <span className="flex gap-3 tabular-nums"><span className="text-[#64748B]">{formatInr(d.costInr)}</span><span className={d.surplusInr < 0 ? "text-[#D85A30]" : "text-[#1D9E75]"}>{formatInr(d.surplusInr)}</span></span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ---- Cost ---- */}
        <TabsContent value="cost">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KCard icon={<Wallet size={15} />} accent="#3266AD" label="Total Salary Cost (INR)" value={v(c?.salaryInr)} sub={sub} />
            <KCard icon={<Wallet size={15} />} accent="#7F77DD" label="Fully-Loaded Cost (INR)" value={v(c?.fullyLoadedInr)} sub={sub} />
            <KCard icon={<Boxes size={15} />} accent="#1D9E75" label="Tool Costs (INR)" value={v(c?.toolInr)} sub={sub} />
            <KCard icon={<Wallet size={15} />} accent="#BA7517" label="Overhead (INR)" value={v(c?.overheadInr)} sub={sub} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <SectionTitle>Cost Breakdown by Cost Centre</SectionTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.charts.costByCostCentre ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={66} tickFormatter={(x) => `₹${(x / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(x: number) => formatInr(x)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="salary" name="Salary" stackId="a" fill="#3266AD" />
                    <Bar dataKey="tool" name="Tool" stackId="a" fill="#1D9E75" />
                    <Bar dataKey="overhead" name="Overhead" stackId="a" fill="#BA7517" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>Monthly Salary Trend</SectionTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.charts.salaryTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={66} tickFormatter={(x) => `₹${(x / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(x: number) => formatInr(x)} />
                    <Line dataKey="salary" name="Salary" stroke="#3266AD" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ---- Capacity ---- */}
        <TabsContent value="capacity">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KCard icon={<Gauge size={15} />} accent="#3266AD" label="Avg Utilisation %" value={cap ? `${cap.avgUtilPct.toFixed(0)}%` : "—"} sub={sub} />
            <KCard icon={<Gauge size={15} />} accent="#D85A30" label="Over-capacity" value={cap ? String(cap.overCap) : "—"} sub={sub} />
            <KCard icon={<Gauge size={15} />} accent="#BA7517" label="Under-utilised" value={cap ? String(cap.underUtil) : "—"} sub={sub} />
            <KCard icon={<Gauge size={15} />} accent="#1D9E75" label="Healthy" value={cap ? String(cap.healthy) : "—"} sub={sub} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <SectionTitle>Utilisation % per Resource</SectionTitle>
              <div className="mt-3" style={{ height: Math.max(256, (cap?.perResource.length ?? 0) * 22) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={cap?.perResource ?? []} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} domain={[0, 120]} tickFormatter={(x) => `${x}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} width={110} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(x: number) => `${x}%`} />
                    <Bar dataKey="pct" name="Utilisation %" radius={[0, 3, 3, 0]}>
                      {cap?.perResource.map((r) => <Cell key={r.id} fill={r.pct > 100 ? "#D85A30" : r.pct >= 80 ? "#1D9E75" : r.pct >= 40 ? "#BA7517" : "#D85A30"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between"><SectionTitle>Capacity Alerts</SectionTitle><Link href="/analytical/utilisation" className="flex items-center gap-1 text-[11px] text-[#3266AD]">View utilisation <ArrowRight size={11} /></Link></div>
              <div className="mt-2 space-y-1.5">
                {data && data.alerts.length === 0 && <div className="text-[12px] text-[#94A3B8]">No utilisation data yet.</div>}
                {data?.alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-[12px]">
                    <span className="font-medium">{a.name} <span className="text-[#94A3B8]">· {a.department}</span></span>
                    <span className="flex items-center gap-2"><span className="tabular-nums">{a.utilisationPct.toFixed(0)}%</span>{statusBadge(a.status)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
