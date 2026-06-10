"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiSend } from "@/lib/api-client";

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
  const isActive = resource.status === "ACTIVE";

  React.useEffect(() => { if (open) { setBillable(resource.isBillable); setNote(""); } }, [open, resource.isBillable]);

  const doTermToggle = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resource.id}/status`, "POST", isActive
        ? { type: "TERMINATION", effectiveDate, reason: note }
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
