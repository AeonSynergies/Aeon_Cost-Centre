"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useReference } from "@/hooks/useReference";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

export interface ServiceEditing {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  costCentreId: string;
  description: string | null;
}

export function ServiceForm({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: ServiceEditing | null;
  onSaved: () => void;
}) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ code: "", name: "", departmentId: "", costCentreId: "", description: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setForm(editing
        ? { code: editing.code, name: editing.name, departmentId: editing.departmentId, costCentreId: editing.costCentreId, description: editing.description ?? "" }
        : { code: "", name: "", departmentId: "", costCentreId: "", description: "" });
    }
  }, [open, editing]);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const body = { name: form.name, departmentId: form.departmentId, costCentreId: form.costCentreId, description: form.description || null };
      if (editing) await apiSend(`/api/services/${editing.id}`, "PATCH", body);
      else await apiSend("/api/services", "POST", { ...body, code: form.code });
      toast("Service saved");
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit Service" : "Add Service"}>
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Service Code</Label><Input value={form.code} disabled={!!editing} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
            <div><Label>Service Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Department</Label>
              <Select value={form.departmentId} onChange={(e) => {
                const deptId = e.target.value;
                const cc = ref?.costCentres.find((c) => c.departmentId === deptId);
                setForm((f) => ({ ...f, departmentId: deptId, costCentreId: cc?.id ?? f.costCentreId }));
              }}>
                <option value="">Select…</option>
                {ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>
            <div><Label>Cost Centre</Label>
              <Select value={form.costCentreId} onChange={(e) => setForm((f) => ({ ...f, costCentreId: e.target.value }))}>
                <option value="">Select…</option>
                {ref?.costCentres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.name || !form.departmentId || !form.costCentreId || (!editing && !form.code)}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
