"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";
import { formatUsd, formatInr } from "@/lib/utils";

type Record_ = {
  id: string; status: string; periodYear: number; periodMonth: number;
  client: { id: string; name: string; billingType: string; paymentMethod: string };
  totalServiceCostUsd: number; proratedFeeUsd: number; discountUsd: number; discountedFeeUsd: number;
  txnFeeUsd: number; netServiceCostUsd: number; stripeFeeUsd: number; grossRevenueUsd: number;
  abbieRoyaltyUsd: number; reserveFundUsd: number; netRevenueUsd: number; skydoFeeUsd: number;
  netUsdToConvert: number; usdInrRate: number; netRevenueInr: number;
};

export default function BillingDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ data: Record_ }>(`/api/billing/${params.id}`, apiGet);
  const r = data?.data;
  const [busy, setBusy] = React.useState(false);

  const finalise = async () => {
    setBusy(true);
    try { await apiSend(`/api/billing/${params.id}/finalise`, "POST"); toast("Billing finalised"); mutate(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setBusy(false); }
  };

  const tsc = r?.totalServiceCostUsd || 1;
  const pctOf = (v: number) => `${((v / tsc) * 100).toFixed(1)}%`;

  const steps: Array<{ label: string; value: string; pct?: string; strong?: boolean }> = r ? [
    { label: "Total Service Cost", value: formatUsd(r.totalServiceCostUsd), pct: "100%", strong: true },
    { label: "Prorated Fee", value: formatUsd(r.proratedFeeUsd), pct: pctOf(r.proratedFeeUsd) },
    { label: "Discount", value: `− ${formatUsd(r.discountUsd)}`, pct: pctOf(r.discountUsd) },
    { label: "Discounted Fee", value: formatUsd(r.discountedFeeUsd), pct: pctOf(r.discountedFeeUsd) },
    { label: "Txn Fee", value: `+ ${formatUsd(r.txnFeeUsd)}`, pct: pctOf(r.txnFeeUsd) },
    { label: "Net Service Cost", value: formatUsd(r.netServiceCostUsd), pct: pctOf(r.netServiceCostUsd) },
    { label: "Stripe Fee", value: `− ${formatUsd(r.stripeFeeUsd)}`, pct: pctOf(r.stripeFeeUsd) },
    { label: "Gross Revenue", value: formatUsd(r.grossRevenueUsd), pct: pctOf(r.grossRevenueUsd), strong: true },
    { label: "Abbie Royalty (10%)", value: `− ${formatUsd(r.abbieRoyaltyUsd)}`, pct: pctOf(r.abbieRoyaltyUsd) },
    { label: "Reserve Fund (15%)", value: `− ${formatUsd(r.reserveFundUsd)}`, pct: pctOf(r.reserveFundUsd) },
    { label: "Net Revenue (USD)", value: formatUsd(r.netRevenueUsd), pct: pctOf(r.netRevenueUsd), strong: true },
    { label: "Skydo Fee (2%)", value: `− ${formatUsd(r.skydoFeeUsd)}`, pct: pctOf(r.skydoFeeUsd) },
    { label: "Net USD to Convert", value: formatUsd(r.netUsdToConvert), pct: pctOf(r.netUsdToConvert) },
    { label: `× Rate A (${r.usdInrRate})`, value: "", },
    { label: "Net Revenue (INR)", value: formatInr(r.netRevenueInr), strong: true },
  ] : [];

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/billing")}><ArrowLeft size={14} /> Billing</Button>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-[22px] font-bold text-[#0F1629]">{r?.client.name ?? "…"}</h1>
        {r && <Badge tone={r.client.billingType === "LEGACY" ? "neutral" : "purple"}>{r.client.billingType}</Badge>}
        {r && <Badge tone="info">{r.client.paymentMethod}</Badge>}
        {r && <StatusBadge status={r.status} />}
        <span className="text-[12px] text-[#64748B]">{r ? `${r.periodMonth}/${r.periodYear}` : ""}</span>
        <div className="ml-auto">
          {r?.status === "DRAFT" && <Button onClick={finalise} disabled={busy}>{busy ? "Finalising…" : "Finalise"}</Button>}
        </div>
      </div>

      <Card className="mt-4 max-w-2xl p-5">
        <SectionTitle>Revenue Waterfall</SectionTitle>
        <div className="mt-3 divide-y divide-[#E8ECF4]">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center justify-between py-2 text-[13px] ${s.strong ? "font-bold text-[#0F1629]" : "text-[#475569]"}`}>
              <span>{s.label}</span>
              <span className="flex items-center gap-3 tabular-nums">
                {s.pct && <span className="text-[11px] text-[#94A3B8]">{s.pct}</span>}
                <span>{s.value}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
