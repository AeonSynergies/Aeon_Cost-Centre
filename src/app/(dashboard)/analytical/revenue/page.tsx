"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChevronRight } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { StatusPills } from "@/components/common/StatusPills";
import { Card, SectionTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, CodeBadges } from "@/components/common/StatusBadge";
import { useReference } from "@/hooks/useReference";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatUsd, formatInr, formatDate } from "@/lib/utils";

type Waterfall = {
  totalServiceCostUsd: number; discountUsd: number; discountedFeeUsd: number; txnFeeUsd: number; netServiceCostUsd: number;
  stripeFeeUsd: number; grossRevenueUsd: number; abbieRoyaltyUsd: number; reserveFundUsd: number; netRevenueUsd: number;
  skydoFeeUsd: number; netUsdToConvert: number; usdInrRate: number; netRevenueInr: number;
};
type Row = Waterfall & { id: string; name: string; billingType: string; paymentMethod: string; packages: string[]; status: string; startDate: string; deptReserveInr: number };

const STEP_KIND: Record<string, "base" | "deduct" | "add" | "final"> = {
  "Total Service Cost": "base", Discount: "deduct", "Discounted Fee": "base", "Txn Fee": "add",
  "Net Service Cost": "base", "Stripe Fee": "deduct", "Gross Revenue": "base", "Abbie Royalty": "deduct",
  "Reserve Fund": "deduct", "Net Revenue (USD)": "base", "Skydo Fee": "deduct", "Net USD": "base",
  "Net Revenue (INR)": "final",
};

function pkgLabel(packages: string[]) {
  return <CodeBadges codes={packages.map((p) => (p === "LESS_THAN_25" ? "<25" : ">25"))} />;
}

export default function RevenueAnalyticsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data: ref } = useReference();
  const [clientId, setClientId] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [status, setStatus] = React.useState("ACTIVE");
  const { data } = useSWR<{ waterfall: Waterfall; rows: Row[] }>(`/api/analytical/revenue?year=${periodYear}&month=${periodMonth}&clientId=${clientId}&method=${method}&status=${status}`, apiGet);

  const w = data?.waterfall;
  const tsc = w?.totalServiceCostUsd || 1;
  const pct = (v: number) => `${((v / tsc) * 100).toFixed(1)}%`;
  // Full waterfall (Total Service Cost → Net Revenue INR) for the Overview tab.
  const steps: { label: string; value: string; pct: string }[] = w ? [
    { label: "Total Service Cost", value: formatUsd(w.totalServiceCostUsd), pct: "100%" },
    { label: "Discount", value: formatUsd(w.discountUsd), pct: pct(w.discountUsd) },
    { label: "Discounted Fee", value: formatUsd(w.discountedFeeUsd), pct: pct(w.discountedFeeUsd) },
    { label: "Txn Fee", value: formatUsd(w.txnFeeUsd), pct: pct(w.txnFeeUsd) },
    { label: "Net Service Cost", value: formatUsd(w.netServiceCostUsd), pct: pct(w.netServiceCostUsd) },
    { label: "Stripe Fee", value: formatUsd(w.stripeFeeUsd), pct: pct(w.stripeFeeUsd) },
    { label: "Gross Revenue", value: formatUsd(w.grossRevenueUsd), pct: pct(w.grossRevenueUsd) },
    { label: "Abbie Royalty", value: formatUsd(w.abbieRoyaltyUsd), pct: pct(w.abbieRoyaltyUsd) },
    { label: "Reserve Fund", value: formatUsd(w.reserveFundUsd), pct: pct(w.reserveFundUsd) },
    { label: "Net Revenue (USD)", value: formatUsd(w.netRevenueUsd), pct: pct(w.netRevenueUsd) },
    { label: "Skydo Fee", value: formatUsd(w.skydoFeeUsd), pct: pct(w.skydoFeeUsd) },
    { label: "Net USD", value: formatUsd(w.netUsdToConvert), pct: pct(w.netUsdToConvert) },
    { label: "Net Revenue (INR)", value: formatInr(w.netRevenueInr), pct: `× ${w.usdInrRate}` },
  ] : [];
  const color = (kind: string) => kind === "deduct" ? "border-[#D85A30] text-[#D85A30]" : kind === "add" ? "border-[#1D9E75] text-[#1D9E75]" : kind === "final" ? "border-[#0F1629] bg-[#0F1629] text-white" : "border-[#E8ECF4] text-[#0F1629]";

  const rows = data?.rows ?? [];

  return (
    <PageShell
      title="Revenue Analysis"
      filterBar={
        <FilterBar>
          <FilterSelect value={clientId} onChange={setClientId} placeholder="All Clients" options={(ref?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={method} onChange={setMethod} placeholder="All Methods" options={[{ value: "CARD", label: "Card" }, { value: "ACH", label: "ACH" }]} />
          <StatusPills value={status} onChange={setStatus} options={[{ value: "", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "CHURNED", label: "Churned" }]} />
        </FilterBar>
      }
    >
      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usd">Revenue (USD)</TabsTrigger>
          <TabsTrigger value="inr">Revenue (INR)</TabsTrigger>
        </TabsList>

        {/* ---- Overview: all KPIs + waterfall ---- */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total Service Cost ($)" value={w ? formatUsd(w.totalServiceCostUsd) : "—"} />
            <KpiCard label="Gross Revenue ($)" value={w ? formatUsd(w.grossRevenueUsd) : "—"} />
            <KpiCard label="Net Revenue (USD)" value={w ? formatUsd(w.netRevenueUsd) : "—"} />
            <KpiCard label="Net Revenue (INR)" value={w ? formatInr(w.netRevenueInr) : "—"} />
            <KpiCard label="Abbie Royalty ($)" value={w ? formatUsd(w.abbieRoyaltyUsd) : "—"} />
            <KpiCard label="Reserve Fund ($)" value={w ? formatUsd(w.reserveFundUsd) : "—"} />
            <KpiCard label="Skydo Fee ($)" value={w ? formatUsd(w.skydoFeeUsd) : "—"} />
            <KpiCard label="Dept Reserve 50% (INR)" value={w ? formatInr(w.netRevenueInr * 0.5) : "—"} />
          </div>
          <Card className="mt-3 p-4">
            <SectionTitle>Revenue Waterfall</SectionTitle>
            <div className="mt-3 flex flex-wrap items-stretch gap-1">
              {steps.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div className={`flex min-w-[120px] flex-1 flex-col rounded-[8px] border px-3 py-2 ${color(STEP_KIND[s.label] ?? "base")}`}>
                    <span className="text-[10px] uppercase opacity-80">{s.label}</span>
                    <span className="text-[14px] font-bold tabular-nums">{s.value}</span>
                    <span className="text-[10px] opacity-70">{s.pct}</span>
                  </div>
                  {i < steps.length - 1 && <ChevronRight size={14} className="self-center text-[#CBD5E1]" />}
                </React.Fragment>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ---- USD table (ends at Net Revenue USD) ---- */}
        <TabsContent value="usd">
          <Card className="p-4">
            <SectionTitle>Client Revenue Breakdown (USD)</SectionTitle>
            <div className="mt-2 max-h-[360px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[11px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]">
                  <th className="py-2">Client</th><th>Start Date</th><th>Billing</th><th>Method</th><th>Package</th><th>Status</th><th>Total SC ($)</th><th>Disc ($)</th><th>Txn ($)</th><th>Net SC ($)</th><th>Stripe ($)</th><th>Gross ($)</th><th>Abbie ($)</th><th>Reserve ($)</th><th>Net Revenue (USD)</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${r.id}`)}>
                      <td className="py-2 font-medium">{r.name}</td><td>{formatDate(r.startDate)}</td>
                      <td><Badge tone={r.billingType === "LEGACY" ? "neutral" : "purple"}>{r.billingType === "LEGACY" ? "Legacy" : "New"}</Badge></td>
                      <td><Badge tone="info">{r.paymentMethod}</Badge></td>
                      <td>{pkgLabel(r.packages)}</td><td><StatusBadge status={r.status} /></td>
                      <td>{formatUsd(r.totalServiceCostUsd)}</td><td>{formatUsd(r.discountUsd)}</td><td>{formatUsd(r.txnFeeUsd)}</td>
                      <td>{formatUsd(r.netServiceCostUsd)}</td><td>{formatUsd(r.stripeFeeUsd)}</td><td>{formatUsd(r.grossRevenueUsd)}</td><td>{formatUsd(r.abbieRoyaltyUsd)}</td>
                      <td>{formatUsd(r.reserveFundUsd)}</td><td>{formatUsd(r.netRevenueUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---- INR table (starts at Net Revenue USD) ---- */}
        <TabsContent value="inr">
          <Card className="p-4">
            <SectionTitle>Client Revenue Breakdown (INR)</SectionTitle>
            <div className="mt-2 max-h-[360px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[11px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]">
                  <th className="py-2">Client</th><th>Start Date</th><th>Billing</th><th>Method</th><th>Package</th><th>Status</th><th>Net Revenue (USD)</th><th>Skydo ($)</th><th>Net USD ($)</th><th>Exchange Rate</th><th>Net Revenue (INR)</th><th>Dept Reserve 50% (INR)</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${r.id}`)}>
                      <td className="py-2 font-medium">{r.name}</td><td>{formatDate(r.startDate)}</td>
                      <td><Badge tone={r.billingType === "LEGACY" ? "neutral" : "purple"}>{r.billingType === "LEGACY" ? "Legacy" : "New"}</Badge></td>
                      <td><Badge tone="info">{r.paymentMethod}</Badge></td>
                      <td>{pkgLabel(r.packages)}</td><td><StatusBadge status={r.status} /></td>
                      <td>{formatUsd(r.netRevenueUsd)}</td><td>{formatUsd(r.skydoFeeUsd)}</td><td>{formatUsd(r.netUsdToConvert)}</td>
                      <td>₹{r.usdInrRate}</td><td>{formatInr(r.netRevenueInr)}</td><td>{formatInr(r.deptReserveInr)}</td>
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
