"use client";

import * as React from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiGet, apiSend } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";

type ExtraCost = { id: string; description: string; amountInr: number; frequency: string; effectiveTo: string | null };

function lastDayOfMonth(iso: string) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export interface ChangeStatusTarget {
  id: string;
  status: string;
  isBillable: boolean;
  activeAssignments: number;
}

export function ChangeStatusModal({
  open,
  onOpenChange,
  resource,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resource: ChangeStatusTarget;
  onSaved: () => void;
}) {
  const [tab, setTab] = React.useState("termination");
  const [effectiveDate, setEffectiveDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState("");
  const [billable, setBillable] = React.useState(resource.isBillable);
  const [saving, setSaving] = React.useState(false);
  const [stopMode, setStopMode] = React.useState<"same" | "month" | "today" | "custom">("same");
  const [customStop, setCustomStop] = React.useState(new Date().toISOString().slice(0, 10));
  const isActive = resource.status === "ACTIVE";

  // Active extra costs for this resource (shown only on the Termination tab).
  const { data: detail } = useSWR<{ data: { extraCosts: ExtraCost[] } }>(open && isActive ? `/api/resources/${resource.id}` : null, apiGet);
  const activeExtras = (detail?.data.extraCosts ?? []).filter((c) => !c.effectiveTo);

  React.useEffect(() => { if (open) { setBillable(resource.isBillable); setNote(""); setStopMode("same"); } }, [open, resource.isBillable]);

  const stopDate = stopMode === "same" ? effectiveDate : stopMode === "month" ? lastDayOfMonth(effectiveDate) : stopMode === "today" ? new Date().toISOString().slice(0, 10) : customStop;

  const doTermToggle = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resource.id}/status`, "POST", isActive
        ? { type: "TERMINATION", effectiveDate, reason: note, extraCostStopDate: stopDate }
        : { type: "REACTIVATION", effectiveDate, notes: note });
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };
  const doBillable = async () => {
    setSaving(true);
    try { await apiSend(`/api/resources/${resource.id}/status`, "POST", { type: "BILLABLE", isBillable: billable, effectiveDate, reason: note }); onSaved(); onOpenChange(false); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Change Status">
        <DialogBody>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="termination">{isActive ? "Termination" : "Reactivation"}</TabsTrigger>
              <TabsTrigger value="billable">Billable</TabsTrigger>
            </TabsList>
            <TabsContent value="termination">
              <p className="mb-3 text-[13px] font-semibold">{isActive ? "Terminate Employee" : "Reactivate Employee"}</p>
              <Label>Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              {isActive && (
                <div className="mt-3 rounded-[5px] bg-[#FAEEDA] px-3 py-2 text-[12px] text-[#633806]">
                  ⚠ Terminating this resource will automatically:
                  <ul className="ml-4 mt-1 list-disc">
                    <li>Set billable status to Non-billable</li>
                    <li>End all active client assignments on the effective date</li>
                  </ul>
                </div>
              )}
              {isActive && activeExtras.length > 0 && (
                <div className="mt-3 rounded-[7px] border border-[#E8ECF4] p-3">
                  <div className="text-[12px] font-semibold text-[#0F1629]">Extra Costs</div>
                  <ul className="mt-1.5 space-y-0.5 text-[12px] text-[#64748B]">
                    {activeExtras.map((c) => <li key={c.id} className="flex justify-between"><span>{c.description}</span><span className="tabular-nums">{formatInr(c.amountInr)}/mo</span></li>)}
                  </ul>
                  <div className="mt-2 text-[12px] font-medium text-[#0F1629]">From when should extra costs stop?</div>
                  <div className="mt-1 space-y-1 text-[12px] text-[#475569]">
                    {([["same", `Same as termination date (${effectiveDate})`], ["month", `End of month (${lastDayOfMonth(effectiveDate)})`], ["today", `Immediately (${new Date().toISOString().slice(0, 10)})`], ["custom", "Custom date"]] as const).map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2">
                        <input type="radio" name="stopMode" checked={stopMode === val} onChange={() => setStopMode(val)} className="accent-[#3266AD]" />
                        {label}
                      </label>
                    ))}
                    {stopMode === "custom" && <Input type="date" value={customStop} onChange={(e) => setCustomStop(e.target.value)} className="w-44" />}
                  </div>
                </div>
              )}
              <div className="mt-3"><Label>{isActive ? "Reason (optional)" : "Notes (optional)"}</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <div className="mt-4 flex justify-end">
                <Button variant={isActive ? "danger" : "success"} onClick={doTermToggle} disabled={saving}>{isActive ? "Terminate" : "Reactivate"}</Button>
              </div>
            </TabsContent>
            <TabsContent value="billable">
              <p className="mb-2 text-[13px]">Currently: <span className="font-semibold">{resource.isBillable ? "Billable ✅" : "Non-billable"}</span></p>
              <div className="flex items-center gap-2"><Switch checked={billable} onCheckedChange={setBillable} /><span className="text-[13px]">{billable ? "Billable" : "Non-billable"}</span></div>
              <div className="mt-3"><Label>Effective Date</Label><Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
              <div className="mt-3"><Label>Reason / Notes</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
              {resource.activeAssignments > 0 && !billable && (
                <div className="mt-3 rounded-[5px] bg-[#FAEEDA] px-3 py-2 text-[12px] text-[#633806]">⚠ Assigned to {resource.activeAssignments} client(s). Changing to non-billable will exclude them from revenue share calculations.</div>
              )}
              <div className="mt-4 flex justify-end"><Button onClick={doBillable} disabled={saving}>Update Billable Status</Button></div>
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
