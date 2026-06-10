"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useReference } from "@/components/common";
import { apiSend } from "@/lib/api-client";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ResourceForm({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { data: ref } = useReference();
  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    employeeNumber: "",
    name: "",
    title: "",
    departmentId: "",
    costCentreId: "",
    joinedDate: "",
    isBillable: false,
    workingDays: [1, 2, 3, 4, 5],
    dailyWorkHours: 8,
    baseSalary: 0,
    incentive: 0,
    allowance: 0,
    effectiveFrom: "",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
    }
  }, [open]);

  const toggleDay = (i: number) =>
    set({
      workingDays: form.workingDays.includes(i)
        ? form.workingDays.filter((d) => d !== i)
        : [...form.workingDays, i].sort(),
    });

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiSend("/api/resources", "POST", {
        ...form,
        baseSalary: Number(form.baseSalary),
        incentive: Number(form.incentive),
        allowance: Number(form.allowance),
        dailyWorkHours: Number(form.dailyWorkHours),
        effectiveFrom: form.effectiveFrom || form.joinedDate,
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Add Resource — Step ${step} of 2`}>
        <DialogBody>
          {error && (
            <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>
          )}
          {step === 1 ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Employee Number</Label>
                <Input value={form.employeeNumber} onChange={(e) => set({ employeeNumber: e.target.value })} />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <div>
                <Label>Joining Date</Label>
                <Input type="date" value={form.joinedDate} onChange={(e) => set({ joinedDate: e.target.value })} />
              </div>
              <div>
                <Label>Department</Label>
                <Select
                  value={form.departmentId}
                  onChange={(e) => {
                    const deptId = e.target.value;
                    const cc = ref?.costCentres.find((c) => c.departmentId === deptId);
                    set({ departmentId: deptId, costCentreId: cc?.id ?? form.costCentreId });
                  }}
                >
                  <option value="">Select…</option>
                  {ref?.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Cost Centre</Label>
                <Select value={form.costCentreId} onChange={(e) => set({ costCentreId: e.target.value })}>
                  <option value="">Select…</option>
                  {ref?.costCentres.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={form.isBillable} onCheckedChange={(v) => set({ isBillable: v })} />
                <span className="text-[13px] text-[#0F1629]">Is Billable</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Working Days</Label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`h-[30px] flex-1 rounded-[6px] text-[11px] font-medium ${
                        form.workingDays.includes(i)
                          ? "bg-[#3266AD] text-white"
                          : "border border-[#E8ECF4] text-[#64748B]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Daily Work Hours</Label>
                <Input type="number" value={form.dailyWorkHours} onChange={(e) => set({ dailyWorkHours: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} />
              </div>
              <div>
                <Label>Base Salary (₹)</Label>
                <Input type="number" value={form.baseSalary} onChange={(e) => set({ baseSalary: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Incentive (₹/mo)</Label>
                <Input type="number" value={form.incentive} onChange={(e) => set({ incentive: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Allowance (₹/mo)</Label>
                <Input type="number" value={form.allowance} onChange={(e) => set({ allowance: Number(e.target.value) })} />
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.employeeNumber || !form.name || !form.title || !form.departmentId || !form.costCentreId || !form.joinedDate}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={submit} disabled={saving || !form.baseSalary}>
                {saving ? "Saving…" : "Create Resource"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
