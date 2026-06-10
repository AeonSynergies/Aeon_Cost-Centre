"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UtilBar } from "@/components/common/UtilBar";
import { apiSend } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";

export interface UtilLog {
  id: string;
  resource: { id: string; name: string };
  dailyTxnVolume: number;
  routesRan: number;
  fleetInvoice: boolean;
  marshInvoice: boolean;
  adocHoursPerDay: number;
  serviceHoursPerDay: number;
  invoiceHoursPerDay: number;
  totalHoursPerDay: number;
  utilisationPct: number;
  monthlyHours: number;
  revenueShareInr: number;
}
export interface UtilAssignment {
  resource: { id: string; name: string; isBillable: boolean };
}

/** Editable per-resource utilisation inputs for a client + period. */
export function UtilisationDataTab({
  clientId,
  assignments,
  logs,
  year,
  month,
  onSaved,
}: {
  clientId: string;
  assignments: UtilAssignment[];
  logs: UtilLog[];
  year: number;
  month: number;
  onSaved: () => void;
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
  clientId: string; resourceId: string; name: string; log?: UtilLog; year: number; month: number; onSaved: () => void;
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
