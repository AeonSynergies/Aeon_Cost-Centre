"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

export interface AssignmentEditing {
  id: string;
  resourceId: string;
  clientName: string;
  serviceLabel: string;
  assignedFrom: string;
  assignedTo: string | null;
}

export function AssignmentEditModal({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AssignmentEditing | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({ assignedFrom: "", assignedTo: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && editing) setForm({ assignedFrom: editing.assignedFrom.slice(0, 10), assignedTo: editing.assignedTo?.slice(0, 10) ?? "" });
  }, [open, editing]);

  if (!editing) return null;

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${editing.resourceId}/assignments/${editing.id}`, "PATCH", { assignedFrom: form.assignedFrom, assignedTo: form.assignedTo || null });
      toast("Assignment updated");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit Assignment">
        <DialogBody>
          <div className="mb-3 rounded-[7px] bg-[#F8F9FC] px-3 py-2 text-[12px] text-[#64748B]">
            <span className="font-semibold text-[#0F1629]">{editing.clientName}</span> · {editing.serviceLabel}
            <div className="mt-0.5 text-[11px]">Use Transfer to change the client/service.</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Assigned From</Label><Input type="date" value={form.assignedFrom} onChange={(e) => setForm((f) => ({ ...f, assignedFrom: e.target.value }))} /></div>
            <div><Label>Assigned To (optional)</Label><Input type="date" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.assignedFrom}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
