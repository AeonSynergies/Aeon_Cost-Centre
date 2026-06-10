"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useReference } from "@/hooks/useReference";
import { apiSend } from "@/lib/api-client";

export interface ActivityEditing {
  id: string;
  serviceId: string;
  name: string;
  defaultExpectedHoursPerDay: number;
}

/** Shared between /services/[id] → Activities and Settings → Utilisation. */
export function ActivityModal({
  open,
  onOpenChange,
  onSaved,
  serviceId,
  editing,
  allowServicePick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  serviceId?: string;
  editing?: ActivityEditing | null;
  allowServicePick?: boolean;
}) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ serviceId: "", name: "", defaultExpectedHoursPerDay: 0 });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      if (editing) setForm({ serviceId: editing.serviceId, name: editing.name, defaultExpectedHoursPerDay: editing.defaultExpectedHoursPerDay });
      else setForm({ serviceId: serviceId ?? "", name: "", defaultExpectedHoursPerDay: 0 });
    }
  }, [open, editing, serviceId]);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const sid = editing?.serviceId ?? serviceId ?? form.serviceId;
      const body = { name: form.name, defaultExpectedHoursPerDay: Number(form.defaultExpectedHoursPerDay) };
      if (editing) await apiSend(`/api/services/${sid}/activities/${editing.id}`, "PATCH", body);
      else await apiSend(`/api/services/${sid}/activities`, "POST", body);
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit Activity" : "Add Activity"}>
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {allowServicePick && !editing && (
              <div className="col-span-2"><Label>Service</Label>
                <Select value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}>
                  <option value="">Select…</option>
                  {ref?.services.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </Select>
              </div>
            )}
            <div className="col-span-2"><Label>Activity Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Default Expected Hours/Day</Label><Input type="number" step="0.05" value={form.defaultExpectedHoursPerDay} onChange={(e) => setForm((f) => ({ ...f, defaultExpectedHoursPerDay: Number(e.target.value) }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.name || (allowServicePick && !editing && !form.serviceId)}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
