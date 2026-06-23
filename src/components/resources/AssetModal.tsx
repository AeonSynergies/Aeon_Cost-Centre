"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { apiSend } from "@/lib/api-client";

export interface AssetEditing {
  id: string;
  assetType: string;
  description: string | null;
  serialNumber: string | null;
  costInr?: number | null;
  issueDate: string;
  returnDate: string | null;
  status: string;
}

export function AssetModal({
  open,
  onOpenChange,
  resourceId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resourceId: string;
  editing: AssetEditing | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({ assetType: "LAPTOP", description: "", serialNumber: "", costInr: 0, issueDate: "", returnDate: "", status: "ISSUED" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(editing
      ? { assetType: editing.assetType, description: editing.description ?? "", serialNumber: editing.serialNumber ?? "", costInr: editing.costInr ?? 0, issueDate: editing.issueDate.slice(0, 10), returnDate: editing.returnDate?.slice(0, 10) ?? "", status: editing.status }
      : { assetType: "LAPTOP", description: "", serialNumber: "", costInr: 0, issueDate: new Date().toISOString().slice(0, 10), returnDate: "", status: "ISSUED" });
  }, [open, editing]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, description: form.description || null, serialNumber: form.serialNumber || null, costInr: form.costInr || null, returnDate: form.returnDate || null };
      if (editing) await apiSend(`/api/resources/${resourceId}/assets/${editing.id}`, "PATCH", body);
      else await apiSend(`/api/resources/${resourceId}/assets`, "POST", body);
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit Asset" : "Add Asset"}>
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.assetType} onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}>{["LAPTOP", "CHARGER", "MOUSE", "KEYBOARD", "MONITOR", "HEADSET", "OTHER"].map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
            <div><Label>Status</Label><Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{["ISSUED", "RETURNED", "LOST"].map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Serial Number</Label><Input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} /></div>
            {form.assetType === "LAPTOP" && (
              <div><Label>Cost (₹) — amortised ÷ 36</Label><Input type="number" value={form.costInr} onChange={(e) => setForm((f) => ({ ...f, costInr: Number(e.target.value) }))} /></div>
            )}
            <div><Label>Issue Date</Label><Input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} /></div>
            <div><Label>Return Date</Label><Input type="date" value={form.returnDate} onChange={(e) => setForm((f) => ({ ...f, returnDate: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.issueDate}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
