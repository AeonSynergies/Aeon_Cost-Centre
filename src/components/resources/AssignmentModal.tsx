"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useReference } from "@/hooks/useReference";
import { apiSend } from "@/lib/api-client";

export function AssignmentModal({
  open,
  onOpenChange,
  resourceId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resourceId: string;
  onSaved: () => void;
}) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ clientId: "", serviceId: "", assignedFrom: "", assignedTo: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { if (open) setForm({ clientId: "", serviceId: "", assignedFrom: "", assignedTo: "" }); }, [open]);

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resourceId}/assignments`, "POST", { ...form, assignedTo: form.assignedTo || null });
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Assign to Client">
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Client</Label><Select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}><option value="">Select…</option>{ref?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div className="col-span-2"><Label>Service</Label><Select value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}><option value="">Select…</option>{ref?.services.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</Select></div>
            <div><Label>Assigned From</Label><Input type="date" value={form.assignedFrom} onChange={(e) => setForm((f) => ({ ...f, assignedFrom: e.target.value }))} /></div>
            <div><Label>Assigned To</Label><Input type="date" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.clientId || !form.serviceId || !form.assignedFrom}>{saving ? "Saving…" : "Assign"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
