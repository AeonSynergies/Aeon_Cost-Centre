"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useReference } from "@/hooks/useReference";
import { apiSend } from "@/lib/api-client";

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
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
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
