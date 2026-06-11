"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UtilBar } from "@/components/common/UtilBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { toast } from "@/store/toastStore";
import { formatInr } from "@/lib/utils";

type RowData = { clientId: string; client: string; dailyTxnVolume: number; routesRan: number; fleetInvoice: boolean; marshInvoice: boolean; adocHoursPerDay: number; serviceHoursPerDay: number; invoiceHoursPerDay: number; totalHoursPerDay: number; utilisationPct: number; monthlyHours: number; revenueShareInr: number; status: string };
type Data = { resource: { id: string; name: string; department: string; isBillable: boolean; status: string }; rows: RowData[]; summary: { totalHoursPerDay: number; utilisationPct: number; monthlyRevenueInr: number; costInr: number; grossMarginInr: number; marginPct: number; status: string } };

export default function UtilisationDetailPage({ params }: { params: { resourceId: string } }) {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, mutate } = useSWR<Data>(`/api/analytical/utilisation/${params.resourceId}?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [inputs, setInputs] = React.useState<Record<string, { dailyTxnVolume: number; routesRan: number; fleetInvoice: boolean; marshInvoice: boolean; adocHoursPerDay: number }>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (data) setInputs(Object.fromEntries(data.rows.map((r) => [r.clientId, { dailyTxnVolume: r.dailyTxnVolume, routesRan: r.routesRan, fleetInvoice: r.fleetInvoice, marshInvoice: r.marshInvoice, adocHoursPerDay: r.adocHoursPerDay }])));
  }, [data]);

  const saveRow = async (clientId: string) => {
    setBusy(true);
    try {
      await apiSend(`/api/analytical/utilisation/${params.resourceId}/save`, "POST", { periodYear, periodMonth, rows: [{ clientId, ...inputs[clientId] }] });
      toast("Saved"); mutate();
    } finally { setBusy(false); }
  };
  const submitAll = async () => { setBusy(true); try { await apiSend(`/api/analytical/utilisation/${params.resourceId}/submit`, "POST", { periodYear, periodMonth }); toast("Submitted"); mutate(); } finally { setBusy(false); } };
  const approveAll = async () => { setBusy(true); try { await apiSend(`/api/analytical/utilisation/${params.resourceId}/approve`, "POST", { periodYear, periodMonth }); toast("Approved"); mutate(); } finally { setBusy(false); } };

  const r = data?.resource;
  const s = data?.summary;
  const set = (cid: string, patch: Partial<(typeof inputs)[string]>) => setInputs((m) => ({ ...m, [cid]: { ...m[cid], ...patch } }));

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/analytical/utilisation")}><ArrowLeft size={14} /> Utilisation</Button>
      <Card className="mt-2 flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2"><span className="text-[18px] font-bold">{r?.name ?? "…"}</span>{r && <StatusBadge status={r.status} />}{s && <Badge tone="info">{s.status}</Badge>}</div>
          <div className="mt-0.5 text-[12px] text-[#64748B]">{r?.department} · Util {s ? s.utilisationPct.toFixed(0) : "—"}%</div>
        </div>
        <Button variant="secondary" onClick={submitAll} disabled={busy}>Submit</Button>
        <Button onClick={approveAll} disabled={busy}>Approve</Button>
      </Card>

      <Card className="mt-3 overflow-auto p-4">
        <SectionTitle>Per-Client Inputs</SectionTitle>
        <table className="mt-2 w-full whitespace-nowrap text-[11px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Client</th><th>Daily Txn</th><th>Routes</th><th>Fleet</th><th>Marsh</th><th>ADOC</th><th>Service Hrs</th><th>Invoice Hrs</th><th>Total Hrs</th><th>Util %</th><th>Monthly Hrs</th><th>Revenue (INR)</th><th></th></tr></thead>
          <tbody>
            {data?.rows.length === 0 && <tr><td colSpan={13} className="py-4 text-center text-[#94A3B8]">No clients assigned.</td></tr>}
            {data?.rows.map((row) => {
              const inp = inputs[row.clientId] ?? row;
              return (
                <tr key={row.clientId} className="border-b border-[#E8ECF4] tabular-nums">
                  <td className="py-2 font-medium">{row.client}</td>
                  <td><Input className="h-[26px] w-16" type="number" value={inp.dailyTxnVolume} onChange={(e) => set(row.clientId, { dailyTxnVolume: Number(e.target.value) })} /></td>
                  <td><Input className="h-[26px] w-16" type="number" value={inp.routesRan} onChange={(e) => set(row.clientId, { routesRan: Number(e.target.value) })} /></td>
                  <td><Switch checked={inp.fleetInvoice} onCheckedChange={(b) => set(row.clientId, { fleetInvoice: b })} /></td>
                  <td><Switch checked={inp.marshInvoice} onCheckedChange={(b) => set(row.clientId, { marshInvoice: b })} /></td>
                  <td><Input className="h-[26px] w-16" type="number" step="0.1" value={inp.adocHoursPerDay} onChange={(e) => set(row.clientId, { adocHoursPerDay: Number(e.target.value) })} /></td>
                  <td>{row.serviceHoursPerDay.toFixed(2)}</td><td>{row.invoiceHoursPerDay.toFixed(2)}</td><td>{row.totalHoursPerDay.toFixed(2)}</td>
                  <td><UtilBar pct={row.utilisationPct} /></td><td>{row.monthlyHours.toFixed(1)}</td><td>{formatInr(row.revenueShareInr)}</td>
                  <td><Button size="sm" onClick={() => saveRow(row.clientId)} disabled={busy}>Save</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="mt-3 p-4">
        <SectionTitle>Resource Summary</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-6 text-[12px]">
          <KV label="Total Hrs/Day" value={s ? s.totalHoursPerDay.toFixed(2) : "—"} />
          <KV label="Overall Util %" value={s ? `${s.utilisationPct.toFixed(0)}%` : "—"} />
          <KV label="Monthly Revenue" value={s ? formatInr(s.monthlyRevenueInr) : "—"} />
          <KV label="Fully-Loaded Cost" value={s ? formatInr(s.costInr) : "—"} />
          <KV label="Gross Margin" value={s ? formatInr(s.grossMarginInr) : "—"} />
          <KV label="Margin %" value={s ? `${s.marginPct.toFixed(0)}%` : "—"} />
        </div>
      </Card>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase text-[#94A3B8]">{label}</div><div className="text-[14px] font-bold">{value}</div></div>;
}
