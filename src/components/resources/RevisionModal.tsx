"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface LatestRevision {
  baseSalary: number;
  incentive: number;
  allowance: number;
  workingDays: number[];
  dailyWorkHours: number;
}

/**
 * Add Revision modal with two tabs. Each tab edits one concern and carries the
 * other fields over from the latest revision so a full ResourceRevision is
 * always created via POST /api/resources/[id]/revisions.
 */
export function RevisionModal({
  open,
  onOpenChange,
  resourceId,
  latest,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resourceId: string;
  latest?: LatestRevision;
  onSaved: () => void;
}) {
  const carried: LatestRevision = latest ?? { baseSalary: 0, incentive: 0, allowance: 0, workingDays: [1, 2, 3, 4, 5], dailyWorkHours: 8 };
  const [tab, setTab] = React.useState("salary");
  const [saving, setSaving] = React.useState(false);

  // Salary tab
  const [salary, setSalary] = React.useState({ effectiveFrom: "", baseSalary: carried.baseSalary, incentive: carried.incentive, allowance: carried.allowance });
  // Schedule tab
  const [schedule, setSchedule] = React.useState({ effectiveFrom: "", workingDays: carried.workingDays, dailyWorkHours: carried.dailyWorkHours });

  React.useEffect(() => {
    if (open) {
      setTab("salary");
      setSalary({ effectiveFrom: "", baseSalary: carried.baseSalary, incentive: carried.incentive, allowance: carried.allowance });
      setSchedule({ effectiveFrom: "", workingDays: carried.workingDays, dailyWorkHours: carried.dailyWorkHours });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleDay = (i: number) =>
    setSchedule((s) => ({ ...s, workingDays: s.workingDays.includes(i) ? s.workingDays.filter((d) => d !== i) : [...s.workingDays, i].sort() }));

  const saveSalary = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resourceId}/revisions`, "POST", {
        effectiveFrom: salary.effectiveFrom,
        baseSalary: Number(salary.baseSalary),
        incentive: Number(salary.incentive),
        allowance: Number(salary.allowance),
        workingDays: carried.workingDays,
        dailyWorkHours: carried.dailyWorkHours,
      });
      toast("Salary revision saved");
      onSaved();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resourceId}/revisions`, "POST", {
        effectiveFrom: schedule.effectiveFrom,
        baseSalary: carried.baseSalary,
        incentive: carried.incentive,
        allowance: carried.allowance,
        workingDays: schedule.workingDays,
        dailyWorkHours: Number(schedule.dailyWorkHours),
      });
      toast("Schedule revision saved");
      onSaved();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add Revision">
        <DialogBody>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="salary">Change Salary</TabsTrigger>
              <TabsTrigger value="schedule">Change Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="salary">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Effective Date</Label><Input type="date" value={salary.effectiveFrom} onChange={(e) => setSalary((s) => ({ ...s, effectiveFrom: e.target.value }))} /></div>
                <div><Label>Base Salary (₹)</Label><Input type="number" value={salary.baseSalary} onChange={(e) => setSalary((s) => ({ ...s, baseSalary: Number(e.target.value) }))} /></div>
                <div><Label>Incentive (₹/mo)</Label><Input type="number" value={salary.incentive} onChange={(e) => setSalary((s) => ({ ...s, incentive: Number(e.target.value) }))} /></div>
                <div><Label>Allowance (₹/mo)</Label><Input type="number" value={salary.allowance} onChange={(e) => setSalary((s) => ({ ...s, allowance: Number(e.target.value) }))} /></div>
              </div>
              <p className="mt-2 text-[11px] text-[#94A3B8]">Working days &amp; hours carried over from the latest revision.</p>
              <div className="mt-4 flex justify-end"><Button onClick={saveSalary} disabled={saving || !salary.effectiveFrom || !salary.baseSalary}>Save Salary Revision</Button></div>
            </TabsContent>

            <TabsContent value="schedule">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Effective Date</Label><Input type="date" value={schedule.effectiveFrom} onChange={(e) => setSchedule((s) => ({ ...s, effectiveFrom: e.target.value }))} /></div>
                <div><Label>Daily Work Hours</Label><Input type="number" value={schedule.dailyWorkHours} onChange={(e) => setSchedule((s) => ({ ...s, dailyWorkHours: Number(e.target.value) }))} /></div>
                <div className="col-span-2"><Label>Working Days</Label>
                  <div className="flex gap-1.5">{DAY_LABELS.map((d, i) => <button key={i} type="button" onClick={() => toggleDay(i)} className={`h-[30px] flex-1 rounded-[6px] text-[11px] ${schedule.workingDays.includes(i) ? "bg-[#3266AD] text-white" : "border border-[#E8ECF4] text-[#64748B]"}`}>{d}</button>)}</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-[#94A3B8]">Salary fields carried over from the latest revision.</p>
              <div className="mt-4 flex justify-end"><Button onClick={saveSchedule} disabled={saving || !schedule.effectiveFrom}>Save Schedule Revision</Button></div>
            </TabsContent>
          </Tabs>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
