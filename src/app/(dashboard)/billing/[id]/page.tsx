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
  client: { id: string; name: string; billingType: string; paymentMethod: string; txnFeeEnabled: boolean };
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

  const prorated = r ? Math.abs(r.proratedFeeUsd - r.totalServiceCostUsd) > 0.01 : false;

  // Waterfall starts at the (prorated) total service cost. Amounts only — no
  // percentages (Abbie is always 10%, Reserve always 15%, fixed by formula).
  const steps: Array<{ label: string; sub?: string; value: string; strong?: boolean; muted?: boolean }> = r ? [
    { label: "Total Service Cost", sub: prorated ? "Prorated" : undefined, value: formatUsd(r.proratedFeeUsd), strong: true },
    { label: "Discount", value: `− ${formatUsd(r.discountUsd)}` },
    { label: "Discounted Fee", value: formatUsd(r.discountedFeeUsd) },
    r.client.txnFeeEnabled
      ? { label: "Txn Fee", value: `+ ${formatUsd(r.txnFeeUsd)}` }
      : { label: "Txn Fee", value: "$0.00 (disabled)", muted: true },
    { label: "Net Service Cost", value: formatUsd(r.netServiceCostUsd) },
    { label: "Stripe Fee", value: `− ${formatUsd(r.stripeFeeUsd)}` },
    { label: "Gross Revenue", value: formatUsd(r.grossRevenueUsd), strong: true },
    { label: "Abbie Royalty", value: `− ${formatUsd(r.abbieRoyaltyUsd)}` },
    { label: "Reserve Fund", value: `− ${formatUsd(r.reserveFundUsd)}` },
    { label: "Net Revenue (USD)", value: formatUsd(r.netRevenueUsd), strong: true },
    { label: "Skydo Fee", value: `− ${formatUsd(r.skydoFeeUsd)}` },
    { label: "Net USD to Convert", value: formatUsd(r.netUsdToConvert) },
    { label: `× Rate A (${r.usdInrRate})`, value: "" },
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
            <div key={i} className={`flex items-center justify-between py-2 text-[13px] ${s.strong ? "font-bold text-[#0F1629]" : s.muted ? "text-[#94A3B8]" : "text-[#475569]"}`}>
              <span>{s.label}{s.sub && <span className="ml-2 text-[10px] uppercase tracking-wide text-[#94A3B8]">{s.sub}</span>}</span>
              <span className="tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
