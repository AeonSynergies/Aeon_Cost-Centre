"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useReference } from "@/hooks/useReference";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

export interface ResourceEditing {
  id: string;
  employeeNumber: string;
  name: string;
  title: string;
  departmentId: string;
  costCentreId: string;
  isBillable: boolean;
}

export function ResourceEditModal({
  open,
  onOpenChange,
  resource,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resource: ResourceEditing | null;
  onSaved: () => void;
}) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ name: "", title: "", departmentId: "", costCentreId: "", isBillable: false });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && resource) setForm({ name: resource.name, title: resource.title, departmentId: resource.departmentId, costCentreId: resource.costCentreId, isBillable: resource.isBillable });
  }, [open, resource]);

  if (!resource) return null;

  const save = async () => {
    setSaving(true);
    try { await apiSend(`/api/resources/${resource.id}`, "PATCH", form); toast("Resource updated"); onSaved(); onOpenChange(false); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit Resource">
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Employee Number</Label><Input value={resource.employeeNumber} disabled /></div>
            <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Department</Label><Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>{ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
            <div><Label>Cost Centre</Label><Select value={form.costCentreId} onChange={(e) => setForm((f) => ({ ...f, costCentreId: e.target.value }))}>{ref?.costCentres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div className="col-span-2 flex items-center gap-2"><Switch checked={form.isBillable} onCheckedChange={(v) => setForm((f) => ({ ...f, isBillable: v }))} /><span className="text-[13px]">Is Billable</span></div>
          </div>
          <p className="mt-2 text-[11px] text-[#94A3B8]">Salary changes are made via Add Revision on the Salary &amp; Schedule tab.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.title}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
