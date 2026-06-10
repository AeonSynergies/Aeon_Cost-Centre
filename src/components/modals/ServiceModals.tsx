"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useReference } from "@/components/ui/bits";
import { apiSend } from "@/lib/api-client";

function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{msg}</div>;
}

export function ServiceAddModal({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ code: "", name: "", departmentId: "", costCentreId: "", description: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { if (open) { setForm({ code: "", name: "", departmentId: "", costCentreId: "", description: "" }); setError(null); } }, [open]);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await apiSend("/api/services", "POST", { ...form, description: form.description || null });
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add Service">
        <DialogBody>
          <ErrorBox msg={error} />
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Service Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
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
          <Button onClick={submit} disabled={saving || !form.code || !form.name || !form.departmentId || !form.costCentreId}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface PackageEditing {
  id: string;
  serviceId: string;
  packageType: string;
  monthlyFeeUsd: number;
  effectiveFrom: string;
}

export function PackageModal({
  open,
  onOpenChange,
  onSaved,
  editing,
  fixedServiceId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  editing?: PackageEditing | null;
  fixedServiceId?: string;
}) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ serviceId: "", packageType: "LESS_THAN_25", monthlyFeeUsd: 0, effectiveFrom: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      if (editing) setForm({ serviceId: editing.serviceId, packageType: editing.packageType, monthlyFeeUsd: editing.monthlyFeeUsd, effectiveFrom: editing.effectiveFrom.slice(0, 10) });
      else setForm({ serviceId: fixedServiceId ?? "", packageType: "LESS_THAN_25", monthlyFeeUsd: 0, effectiveFrom: new Date().toISOString().slice(0, 10) });
    }
  }, [open, editing, fixedServiceId]);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const sid = fixedServiceId ?? form.serviceId;
      const body = { packageType: form.packageType, monthlyFeeUsd: Number(form.monthlyFeeUsd), effectiveFrom: form.effectiveFrom };
      if (editing) await apiSend(`/api/services/${editing.serviceId}/packages/${editing.id}`, "PATCH", body);
      else await apiSend(`/api/services/${sid}/packages`, "POST", body);
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit Package" : "Add Package"}>
        <DialogBody>
          <ErrorBox msg={error} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Package Type</Label>
              <Select value={form.packageType} onChange={(e) => setForm((f) => ({ ...f, packageType: e.target.value }))}>
                <option value="LESS_THAN_25">Less than 25 Routes</option>
                <option value="MORE_THAN_25">More than 25 Routes</option>
              </Select>
            </div>
            {!fixedServiceId && (
              <div className="col-span-2"><Label>Service</Label>
                <Select value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} disabled={!!editing}>
                  <option value="">Select…</option>
                  {ref?.services.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </Select>
              </div>
            )}
            <div><Label>Monthly Fee ($)</Label><Input type="number" value={form.monthlyFeeUsd} onChange={(e) => setForm((f) => ({ ...f, monthlyFeeUsd: Number(e.target.value) }))} /></div>
            <div><Label>Effective From</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || (!fixedServiceId && !editing && !form.serviceId)}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface ActivityEditing {
  id: string;
  serviceId: string;
  name: string;
  defaultExpectedHoursPerDay: number;
}

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
          <ErrorBox msg={error} />
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
