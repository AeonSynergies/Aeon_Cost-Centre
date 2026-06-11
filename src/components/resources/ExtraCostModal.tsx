"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

export interface ExtraCostEditing {
  id: string;
  description: string;
  category: string;
  amountInr: number;
  frequency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

const CATEGORIES = ["Training", "Equipment", "Travel", "Software", "Other"];

export function ExtraCostModal({
  open,
  onOpenChange,
  resourceId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resourceId: string;
  editing: ExtraCostEditing | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({ description: "", category: "Training", amountInr: 0, frequency: "MONTHLY", effectiveFrom: "", effectiveTo: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(editing
      ? { description: editing.description, category: editing.category, amountInr: editing.amountInr, frequency: editing.frequency, effectiveFrom: editing.effectiveFrom.slice(0, 10), effectiveTo: editing.effectiveTo?.slice(0, 10) ?? "" }
      : { description: "", category: "Training", amountInr: 0, frequency: "MONTHLY", effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: "" });
  }, [open, editing]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, amountInr: Number(form.amountInr), effectiveTo: form.effectiveTo || null };
      if (editing) await apiSend(`/api/resources/${resourceId}/extra-costs/${editing.id}`, "PATCH", body);
      else await apiSend(`/api/resources/${resourceId}/extra-costs`, "POST", body);
      toast("Extra cost saved");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit Extra Cost" : "Add Extra Cost"}>
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Category</Label><Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
            <div><Label>Amount (₹)</Label><Input type="number" value={form.amountInr} onChange={(e) => setForm((f) => ({ ...f, amountInr: Number(e.target.value) }))} /></div>
            <div><Label>Frequency</Label><Select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}><option value="MONTHLY">Monthly</option><option value="ONE_TIME">One-time</option></Select></div>
            <div><Label>Effective From</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></div>
            <div><Label>Effective To (optional)</Label><Input type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.description || !form.amountInr || !form.effectiveFrom}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
