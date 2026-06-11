"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useReference } from "@/hooks/useReference";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

export interface TransferTarget {
  assignmentId: string;
  resourceId: string;
  clientName: string;
  serviceLabel: string;
}

/** Transfer an active assignment to another billable resource. */
export function TransferModal({
  open,
  onOpenChange,
  target,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: TransferTarget | null;
  onSaved: () => void;
}) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ toResourceId: "", effectiveDate: "", notes: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { if (open) setForm({ toResourceId: "", effectiveDate: new Date().toISOString().slice(0, 10), notes: "" }); }, [open]);

  if (!target) return null;

  const candidates = (ref?.resources ?? []).filter((r) => r.id !== target.resourceId);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiSend<{ message?: string }>(
        `/api/resources/${target.resourceId}/assignments/${target.assignmentId}/transfer`,
        "POST",
        { toResourceId: form.toResourceId, effectiveDate: form.effectiveDate, notes: form.notes }
      );
      toast(res.message ?? "Assignment transferred");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Transfer Assignment">
        <DialogBody>
          <div className="mb-3 rounded-[7px] bg-[#F8F9FC] px-3 py-2 text-[12px] text-[#64748B]">
            <span className="font-semibold text-[#0F1629]">{target.clientName}</span> · {target.serviceLabel}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Transfer To Resource</Label>
              <Select value={form.toResourceId} onChange={(e) => setForm((f) => ({ ...f, toResourceId: e.target.value }))}>
                <option value="">Select…</option>
                {candidates.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2"><Label>Effective Date</Label><Input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Notes (optional)</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.toResourceId || !form.effectiveDate}>{saving ? "Transferring…" : "Transfer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
