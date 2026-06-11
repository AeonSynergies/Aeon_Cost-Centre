"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChevronRight } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, CodeBadges } from "@/components/common/StatusBadge";
import { useReference } from "@/hooks/useReference";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatUsd, formatInr } from "@/lib/utils";

type Waterfall = {
  totalServiceCostUsd: number; discountUsd: number; discountedFeeUsd: number; txnFeeUsd: number; netServiceCostUsd: number;
  stripeFeeUsd: number; grossRevenueUsd: number; abbieRoyaltyUsd: number; reserveFundUsd: number; netRevenueUsd: number;
  skydoFeeUsd: number; netUsdToConvert: number; usdInrRate: number; netRevenueInr: number;
};
type Row = Waterfall & { id: string; name: string; billingType: string; paymentMethod: string; packages: string[]; status: string; proratedFeeUsd: number };

const STEP_KIND: Record<string, "base" | "deduct" | "add" | "final"> = {
  "Total Service Cost": "base", Discount: "deduct", "Discounted Fee": "base", "Txn Fee": "add",
  "Net Service Cost": "base", "Stripe Fee": "deduct", "Gross Revenue": "base", "Abbie Royalty (10%)": "deduct",
  "Reserve Fund (15%)": "deduct", "Net Revenue (USD)": "base", "Skydo Fee (2%)": "deduct", "Net USD": "base",
  "Net Revenue (INR)": "final",
};

export default function RevenueAnalyticsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data: ref } = useReference();
  const [clientId, setClientId] = React.useState("");
  const [method, setMethod] = React.useState("");
  const { data } = useSWR<{ waterfall: Waterfall; rows: Row[] }>(`/api/analytical/revenue?year=${periodYear}&month=${periodMonth}&clientId=${clientId}&method=${method}`, apiGet);

  const w = data?.waterfall;
  const tsc = w?.totalServiceCostUsd || 1;
  const pct = (v: number) => `${((v / tsc) * 100).toFixed(1)}%`;
  const steps: { label: string; value: string; pct: string }[] = w ? [
    { label: "Total Service Cost", value: formatUsd(w.totalServiceCostUsd), pct: "100%" },
    { label: "Discount", value: formatUsd(w.discountUsd), pct: pct(w.discountUsd) },
    { label: "Discounted Fee", value: formatUsd(w.discountedFeeUsd), pct: pct(w.discountedFeeUsd) },
    { label: "Txn Fee", value: formatUsd(w.txnFeeUsd), pct: pct(w.txnFeeUsd) },
    { label: "Net Service Cost", value: formatUsd(w.netServiceCostUsd), pct: pct(w.netServiceCostUsd) },
    { label: "Stripe Fee", value: formatUsd(w.stripeFeeUsd), pct: pct(w.stripeFeeUsd) },
    { label: "Gross Revenue", value: formatUsd(w.grossRevenueUsd), pct: pct(w.grossRevenueUsd) },
    { label: "Abbie Royalty (10%)", value: formatUsd(w.abbieRoyaltyUsd), pct: pct(w.abbieRoyaltyUsd) },
    { label: "Reserve Fund (15%)", value: formatUsd(w.reserveFundUsd), pct: pct(w.reserveFundUsd) },
    { label: "Net Revenue (USD)", value: formatUsd(w.netRevenueUsd), pct: pct(w.netRevenueUsd) },
    { label: "Skydo Fee (2%)", value: formatUsd(w.skydoFeeUsd), pct: pct(w.skydoFeeUsd) },
    { label: "Net USD", value: formatUsd(w.netUsdToConvert), pct: pct(w.netUsdToConvert) },
    { label: "Net Revenue (INR)", value: formatInr(w.netRevenueInr), pct: `× ${w.usdInrRate}` },
  ] : [];

  const color = (kind: string) => kind === "deduct" ? "border-[#D85A30] text-[#D85A30]" : kind === "add" ? "border-[#1D9E75] text-[#1D9E75]" : kind === "final" ? "border-[#0F1629] bg-[#0F1629] text-white" : "border-[#E8ECF4] text-[#0F1629]";

  return (
    <PageShell
      title="Revenue Analysis"
      filterBar={
        <FilterBar>
          <FilterSelect value={clientId} onChange={setClientId} placeholder="All Clients" options={(ref?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={method} onChange={setMethod} placeholder="All Methods" options={[{ value: "CARD", label: "Card" }, { value: "ACH", label: "ACH" }]} />
        </FilterBar>
      }
    >
      <Card className="p-4">
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

      <Card className="overflow-auto p-4">
        <SectionTitle>Client Revenue Breakdown</SectionTitle>
        <table className="mt-2 w-full whitespace-nowrap text-[11px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]">
            <th className="py-2">Client</th><th>Billing</th><th>Method</th><th>Package</th><th>Total SC ($)</th><th>Disc ($)</th><th>Disc Fee ($)</th><th>Txn ($)</th><th>Net SC ($)</th><th>Stripe ($)</th><th>Gross ($)</th><th>Abbie ($)</th><th>Reserve ($)</th><th>Net (USD)</th><th>Skydo ($)</th><th>Net USD</th><th>Rate</th><th>Net (INR)</th><th>Status</th>
          </tr></thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${r.id}`)}>
                <td className="py-2 font-medium">{r.name}</td>
                <td><Badge tone={r.billingType === "LEGACY" ? "neutral" : "purple"}>{r.billingType === "LEGACY" ? "Legacy" : "New"}</Badge></td>
                <td><Badge tone="info">{r.paymentMethod}</Badge></td>
                <td><CodeBadges codes={r.packages.map((p) => (p === "LESS_THAN_25" ? "<25" : ">25"))} /></td>
                <td>{formatUsd(r.totalServiceCostUsd)}</td><td>{formatUsd(r.discountUsd)}</td><td>{formatUsd(r.discountedFeeUsd)}</td><td>{formatUsd(r.txnFeeUsd)}</td>
                <td>{formatUsd(r.netServiceCostUsd)}</td><td>{formatUsd(r.stripeFeeUsd)}</td><td>{formatUsd(r.grossRevenueUsd)}</td><td>{formatUsd(r.abbieRoyaltyUsd)}</td>
                <td>{formatUsd(r.reserveFundUsd)}</td><td>{formatUsd(r.netRevenueUsd)}</td><td>{formatUsd(r.skydoFeeUsd)}</td><td>{formatUsd(r.netUsdToConvert)}</td>
                <td>{r.usdInrRate}</td><td>{formatInr(r.netRevenueInr)}</td><td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PageShell>
  );
}
