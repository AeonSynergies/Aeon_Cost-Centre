"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge, UtilBar } from "@/components/ui/bits";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/lib/store";
import { formatUsd, formatInr, formatDate } from "@/lib/utils";

type Detail = {
  data: {
    id: string; name: string; startDate: string; endDate: string | null;
    billingType: string; paymentMethod: string; driverBand: string | null; vanBand: string | null; routeBand: string | null;
    services: { id: string; packageType: string; monthlyFeeUsd: number; service: { id: string; code: string; name: string; department: { name: string } | null } }[];
    billingRecords: { id: string; periodYear: number; periodMonth: number; proratedFeeUsd: number; discountUsd: number; stripeFeeUsd: number; grossRevenueUsd: number; netRevenueUsd: number; netRevenueInr: number; status: string }[];
    assignments: { id: string; resource: { id: string; name: string; isBillable: boolean }; service: { id: string; code: string; name: string }; assignedFrom: string; assignedTo: string | null }[];
    utilisationLogs: { id: string; resource: { id: string; name: string }; dailyTxnVolume: number; routesRan: number; fleetInvoice: boolean; marshInvoice: boolean; adocHoursPerDay: number; serviceHoursPerDay: number; invoiceHoursPerDay: number; totalHoursPerDay: number; utilisationPct: number; monthlyHours: number; revenueShareInr: number }[];
  };
  metrics: { monthlyFeeUsd: number; monthlyFeeInr: number; waterfall: { grossRevenueUsd: number; netRevenueUsd: number; netRevenueInr: number } };
};

export default function ClientDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, mutate } = useSWR<Detail>(`/api/clients/${params.id}?year=${periodYear}&month=${periodMonth}`, apiGet);
  const c = data?.data;
  const m = data?.metrics;

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}><ArrowLeft size={14} /> Clients</Button>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-[22px] font-bold text-[#0F1629]">{c?.name ?? "…"}</h1>
        {c && <Badge tone={c.billingType === "LEGACY" ? "neutral" : "purple"}>{c.billingType}</Badge>}
        {c && <Badge tone="info">{c.paymentMethod}</Badge>}
        {c && <StatusBadge status={c.endDate && new Date(c.endDate) < new Date() ? "CHURNED" : "ACTIVE"} />}
      </div>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="utilisation">Utilisation Data</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="p-4">
              <SectionTitle>Basic Info</SectionTitle>
              <dl className="mt-2 space-y-1 text-[12px]">
                <Row k="Start" v={formatDate(c?.startDate)} />
                <Row k="End" v={formatDate(c?.endDate)} />
                <Row k="Method" v={c?.paymentMethod ?? "—"} />
                <Row k="Billing" v={c?.billingType ?? "—"} />
              </dl>
            </Card>
            <Card className="p-4">
              <SectionTitle>Fleet Details</SectionTitle>
              <dl className="mt-2 space-y-1 text-[12px]">
                <Row k="Drivers" v={c?.driverBand ?? "—"} />
                <Row k="Vans" v={c?.vanBand ?? "—"} />
                <Row k="Daily Routes" v={c?.routeBand ?? "—"} />
              </dl>
            </Card>
            <Card className="p-4">
              <SectionTitle>Revenue (period)</SectionTitle>
              <dl className="mt-2 space-y-1 text-[12px]">
                <Row k="MRR ($)" v={m ? formatUsd(m.monthlyFeeUsd) : "—"} />
                <Row k="Net Revenue ($)" v={m ? formatUsd(m.waterfall.netRevenueUsd) : "—"} />
                <Row k="Net Revenue (INR)" v={m ? formatInr(m.waterfall.netRevenueInr) : "—"} />
              </dl>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Code</th><th>Package</th><th>Fee ($)</th><th>Department</th><th>Resources</th></tr></thead>
              <tbody>
                {c?.services.map((s) => (
                  <tr key={s.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/services/${s.service.id}`)}>
                    <td className="py-2 font-mono text-[11px]">{s.service.code}</td>
                    <td>{s.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td>
                    <td>{formatUsd(s.monthlyFeeUsd)}</td>
                    <td>{s.service.department?.name ?? "—"}</td>
                    <td>{c.assignments.filter((a) => a.service.id === s.service.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="p-4">
            {c?.billingRecords.length ? (
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Period</th><th>Prorated</th><th>Discount</th><th>Stripe</th><th>Gross ($)</th><th>Net ($)</th><th>Net (₹)</th><th>Status</th></tr></thead>
                <tbody>
                  {c.billingRecords.map((b) => (
                    <tr key={b.id} className="border-b border-[#E8ECF4]">
                      <td className="py-2">{b.periodMonth}/{b.periodYear}</td>
                      <td>{formatUsd(b.proratedFeeUsd)}</td><td>{formatUsd(b.discountUsd)}</td><td>{formatUsd(b.stripeFeeUsd)}</td>
                      <td>{formatUsd(b.grossRevenueUsd)}</td><td>{formatUsd(b.netRevenueUsd)}</td><td>{formatInr(b.netRevenueInr)}</td>
                      <td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-[13px] text-[#64748B]">No billing records yet. Generate from the Billing page.</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="utilisation">
          <UtilisationTab clientId={params.id} assignments={c?.assignments ?? []} logs={c?.utilisationLogs ?? []} year={periodYear} month={periodMonth} onSaved={() => mutate()} />
        </TabsContent>

        <TabsContent value="resources">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Service</th><th>From</th><th>To</th><th>Status</th></tr></thead>
              <tbody>
                {c?.assignments.map((a) => (
                  <tr key={a.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${a.resource.id}`)}>
                    <td className="py-2 font-medium">{a.resource.name}</td>
                    <td className="font-mono text-[11px]">{a.service.code}</td>
                    <td>{formatDate(a.assignedFrom)}</td>
                    <td>{formatDate(a.assignedTo)}</td>
                    <td><StatusBadge status={a.assignedTo && new Date(a.assignedTo) < new Date() ? "TERMED" : "ACTIVE"} /></td>
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between"><dt className="text-[#94A3B8]">{k}</dt><dd className="font-medium text-[#0F1629]">{v}</dd></div>;
}

function UtilisationTab({
  clientId, assignments, logs, year, month, onSaved,
}: {
  clientId: string;
  assignments: Detail["data"]["assignments"];
  logs: Detail["data"]["utilisationLogs"];
  year: number; month: number; onSaved: () => void;
}) {
  const resources = Array.from(new Map(assignments.map((a) => [a.resource.id, a.resource])).values());
  return (
    <Card className="p-4">
      {resources.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[#64748B]">No resources assigned to this client.</div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const log = logs.find((l) => l.resource.id === r.id);
            return <UtilRow key={r.id} clientId={clientId} resourceId={r.id} name={r.name} log={log} year={year} month={month} onSaved={onSaved} />;
          })}
        </div>
      )}
    </Card>
  );
}

function UtilRow({
  clientId, resourceId, name, log, year, month, onSaved,
}: {
  clientId: string; resourceId: string; name: string;
  log?: Detail["data"]["utilisationLogs"][number];
  year: number; month: number; onSaved: () => void;
}) {
  const [v, setV] = React.useState({
    dailyTxnVolume: log?.dailyTxnVolume ?? 0,
    routesRan: log?.routesRan ?? 0,
    fleetInvoice: log?.fleetInvoice ?? false,
    marshInvoice: log?.marshInvoice ?? false,
    adocHoursPerDay: log?.adocHoursPerDay ?? 0,
  });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/clients/${clientId}/utilisation`, "POST", { resourceId, periodYear: year, periodMonth: month, ...v });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-[8px] border border-[#E8ECF4] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold">{name}</span>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="Daily Txn"><Input className="h-[28px]" type="number" value={v.dailyTxnVolume} onChange={(e) => setV((s) => ({ ...s, dailyTxnVolume: Number(e.target.value) }))} /></Field>
        <Field label="Routes Ran"><Input className="h-[28px]" type="number" value={v.routesRan} onChange={(e) => setV((s) => ({ ...s, routesRan: Number(e.target.value) }))} /></Field>
        <Field label="Fleet"><Switch checked={v.fleetInvoice} onCheckedChange={(b) => setV((s) => ({ ...s, fleetInvoice: b }))} /></Field>
        <Field label="Marsh"><Switch checked={v.marshInvoice} onCheckedChange={(b) => setV((s) => ({ ...s, marshInvoice: b }))} /></Field>
        <Field label="ADOC Hrs"><Input className="h-[28px]" type="number" step="0.1" value={v.adocHoursPerDay} onChange={(e) => setV((s) => ({ ...s, adocHoursPerDay: Number(e.target.value) }))} /></Field>
      </div>
      {log && (
        <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-[#E8ECF4] pt-2 text-[11px] text-[#64748B]">
          <span>Service: {log.serviceHoursPerDay}h</span>
          <span>Invoice: {log.invoiceHoursPerDay}h</span>
          <span>Total: {log.totalHoursPerDay.toFixed(2)}h</span>
          <UtilBar pct={log.utilisationPct} />
          <span>Monthly: {log.monthlyHours.toFixed(1)}h</span>
          <span>Revenue: {formatInr(log.revenueShareInr)}</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-0.5 text-[10px] uppercase text-[#94A3B8]">{label}</div>{children}</div>;
}
