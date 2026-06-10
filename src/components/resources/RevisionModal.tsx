"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiSend } from "@/lib/api-client";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RevisionModal({
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
  const [form, setForm] = React.useState({ effectiveFrom: "", baseSalary: 0, incentive: 0, allowance: 0, workingDays: [1, 2, 3, 4, 5], dailyWorkHours: 8 });
  const [saving, setSaving] = React.useState(false);
  const toggleDay = (i: number) =>
    setForm((f) => ({ ...f, workingDays: f.workingDays.includes(i) ? f.workingDays.filter((d) => d !== i) : [...f.workingDays, i].sort() }));

  React.useEffect(() => { if (open) setForm({ effectiveFrom: "", baseSalary: 0, incentive: 0, allowance: 0, workingDays: [1, 2, 3, 4, 5], dailyWorkHours: 8 }); }, [open]);

  const save = async () => {
    setSaving(true);
    try { await apiSend(`/api/resources/${resourceId}/revisions`, "POST", { ...form, baseSalary: Number(form.baseSalary) }); onSaved(); onOpenChange(false); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add Revision">
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Effective Date</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></div>
            <div><Label>Daily Work Hours</Label><Input type="number" value={form.dailyWorkHours} onChange={(e) => setForm((f) => ({ ...f, dailyWorkHours: Number(e.target.value) }))} /></div>
            <div><Label>Base Salary (₹)</Label><Input type="number" value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: Number(e.target.value) }))} /></div>
            <div><Label>Incentive (₹)</Label><Input type="number" value={form.incentive} onChange={(e) => setForm((f) => ({ ...f, incentive: Number(e.target.value) }))} /></div>
            <div><Label>Allowance (₹)</Label><Input type="number" value={form.allowance} onChange={(e) => setForm((f) => ({ ...f, allowance: Number(e.target.value) }))} /></div>
            <div className="col-span-2"><Label>Working Days</Label>
              <div className="flex gap-1.5">{DAY_LABELS.map((d, i) => <button key={i} type="button" onClick={() => toggleDay(i)} className={`h-[30px] flex-1 rounded-[6px] text-[11px] ${form.workingDays.includes(i) ? "bg-[#3266AD] text-white" : "border border-[#E8ECF4] text-[#64748B]"}`}>{d}</button>)}</div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.effectiveFrom || !form.baseSalary}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
