"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Plus } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, StatusBadge, WorkingDayChips, useReference } from "@/components/ui/bits";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/lib/store";
import { formatInr, formatUsd, formatDate } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Revision { id: string; effectiveFrom: string; baseSalary: number; incentive: number; allowance: number; workingDays: number[]; dailyWorkHours: number }
interface Asset { id: string; assetType: string; description: string | null; serialNumber: string | null; issueDate: string; returnDate: string | null; status: string }
interface Assignment { id: string; client: { id: string; name: string }; service: { id: string; code: string; name: string }; assignedFrom: string; assignedTo: string | null }
interface ResourceData {
  id: string; employeeNumber: string; name: string; title: string; isBillable: boolean; status: string;
  joinedDate: string; terminatedDate: string | null; laptopCostInr: number | null; laptopIssueDate: string | null; overheadManual: number | null;
  department: { id: string; name: string }; costCentre: { id: string; name: string; ms365RateInr: number; zoomRateUsd: number };
  revisions: Revision[]; assets: Asset[]; assignments: Assignment[];
}
interface Cost { baseSalary: number; incentive: number; allowance: number; overhead: number; laptopAmortised: number; ms365Cost: number; zoomCost: number; totalCostInr: number; totalCostUsd: number }

export default function ResourceDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, mutate } = useSWR<{ data: ResourceData; cost: Cost }>(`/api/resources/${params.id}?year=${periodYear}&month=${periodMonth}`, apiGet);
  const r = data?.data;
  const cost = data?.cost;
  const [statusOpen, setStatusOpen] = React.useState(false);
  const refresh = () => mutate();

  const latestRev = r?.revisions[0];

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/resources")}><ArrowLeft size={14} /> Resources</Button>

      <Card className="mt-2 flex flex-wrap items-center gap-4 p-4">
        <Avatar name={r?.name ?? "?"} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold">{r?.name ?? "…"}</span>
            {r && <StatusBadge status={r.status} />}
            {r && <Badge tone={r.isBillable ? "success" : "neutral"}>{r.isBillable ? "Billable" : "Non-billable"}</Badge>}
          </div>
          <div className="mt-0.5 text-[12px] text-[#64748B]">
            <span className="font-mono">{r?.employeeNumber}</span> · {r?.department.name} · {r?.costCentre.name} · Joined {formatDate(r?.joinedDate)}
          </div>
        </div>
        <Button variant="secondary" onClick={() => setStatusOpen(true)}>Change Status</Button>
      </Card>

      <Tabs defaultValue="profile" className="mt-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="salary">Salary &amp; Schedule</TabsTrigger>
          <TabsTrigger value="extra">Extra Costs</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">{r && <ProfileTab resource={r} onSaved={refresh} />}</TabsContent>

        <TabsContent value="salary">
          {r && cost && (
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="p-4">
                <SectionTitle>Current Revision</SectionTitle>
                {latestRev ? (
                  <dl className="mt-2 space-y-1 text-[12px]">
                    <KV k="Effective From" v={formatDate(latestRev.effectiveFrom)} />
                    <KV k="Base Salary" v={`${formatInr(latestRev.baseSalary)}`} />
                    <KV k="Incentive" v={formatInr(latestRev.incentive)} />
                    <KV k="Allowance" v={formatInr(latestRev.allowance)} />
                    <KV k="Daily Hours" v={String(latestRev.dailyWorkHours)} />
                    <div className="flex justify-between"><dt className="text-[#94A3B8]">Working Days</dt><dd><WorkingDayChips days={latestRev.workingDays} /></dd></div>
                  </dl>
                ) : <p className="mt-2 text-[12px] text-[#64748B]">No revisions.</p>}
                <div className="mt-3"><AddRevisionButton resourceId={params.id} onSaved={refresh} /></div>
              </Card>

              <Card className="p-4">
                <SectionTitle>Cost Breakdown (period)</SectionTitle>
                <dl className="mt-2 space-y-1 text-[12px]">
                  <KV k="Base Salary" v={formatInr(cost.baseSalary)} />
                  <KV k="Incentive" v={formatInr(cost.incentive)} />
                  <KV k="Allowance" v={formatInr(cost.allowance)} />
                  <KV k="Overhead" v={formatInr(cost.overhead)} />
                  <KV k="MS365" v={formatInr(cost.ms365Cost)} />
                  <KV k="Zoom" v={formatInr(cost.zoomCost)} />
                  <KV k="Laptop (amortised)" v={formatInr(cost.laptopAmortised)} />
                  <div className="flex justify-between border-t border-[#E8ECF4] pt-1 font-semibold"><dt>Total Cost</dt><dd>{formatInr(cost.totalCostInr)} <span className="text-[#94A3B8]">({formatUsd(cost.totalCostUsd)})</span></dd></div>
                </dl>
              </Card>

              <Card className="p-4 lg:col-span-2">
                <SectionTitle>Revision History</SectionTitle>
                <table className="mt-2 w-full text-[12px]">
                  <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Effective From</th><th>Base (₹)</th><th>Incentive</th><th>Allowance</th><th>Working Days</th><th>Hrs/Day</th></tr></thead>
                  <tbody>
                    {r.revisions.map((rev) => (
                      <tr key={rev.id} className="border-b border-[#E8ECF4]">
                        <td className="py-2">{formatDate(rev.effectiveFrom)}</td>
                        <td>{formatInr(rev.baseSalary)}</td><td>{formatInr(rev.incentive)}</td><td>{formatInr(rev.allowance)}</td>
                        <td><WorkingDayChips days={rev.workingDays} /></td><td>{rev.dailyWorkHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="extra">{r && <ExtraCostsTab resource={r} onSaved={refresh} />}</TabsContent>
        <TabsContent value="assets">{r && <AssetsTab resourceId={params.id} assets={r.assets} onSaved={refresh} />}</TabsContent>
        <TabsContent value="assignments">{r && <AssignmentsTab resourceId={params.id} assignments={r.assignments} onSaved={refresh} />}</TabsContent>
      </Tabs>

      {r && <ChangeStatusModal open={statusOpen} onOpenChange={setStatusOpen} resource={r} onSaved={refresh} />}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between"><dt className="text-[#94A3B8]">{k}</dt><dd className="font-medium text-[#0F1629]">{v}</dd></div>;
}

function ProfileTab({ resource, onSaved }: { resource: ResourceData; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ name: resource.name, title: resource.title, departmentId: resource.department.id, costCentreId: resource.costCentre.id, isBillable: resource.isBillable });
  const [saving, setSaving] = React.useState(false);
  const save = async () => { setSaving(true); try { await apiSend(`/api/resources/${resource.id}`, "PATCH", form); onSaved(); } finally { setSaving(false); } };
  return (
    <Card className="max-w-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
        <div><Label>Department</Label><Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>{ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
        <div><Label>Cost Centre</Label><Select value={form.costCentreId} onChange={(e) => setForm((f) => ({ ...f, costCentreId: e.target.value }))}>{ref?.costCentres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div className="col-span-2 flex items-center gap-2"><Switch checked={form.isBillable} onCheckedChange={(v) => setForm((f) => ({ ...f, isBillable: v }))} /><span className="text-[13px]">Billable</span></div>
      </div>
      <div className="mt-3 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button></div>
    </Card>
  );
}

function ExtraCostsTab({ resource, onSaved }: { resource: ResourceData; onSaved: () => void }) {
  const [laptop, setLaptop] = React.useState(resource.laptopCostInr ?? 0);
  const [issueDate, setIssueDate] = React.useState(resource.laptopIssueDate?.slice(0, 10) ?? "");
  const [manual, setManual] = React.useState<boolean>(resource.overheadManual != null);
  const [overhead, setOverhead] = React.useState(resource.overheadManual ?? 0);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resource.id}`, "PATCH", {
        laptopCostInr: laptop || null,
        laptopIssueDate: issueDate || null,
        overheadManual: manual ? Number(overhead) : null,
      });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="grid max-w-2xl gap-3">
      <Card className="p-4">
        <SectionTitle>Laptop</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div><Label>Total Cost (₹)</Label><Input type="number" value={laptop} onChange={(e) => setLaptop(Number(e.target.value))} /></div>
          <div><Label>Issue Date</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
        </div>
        <p className="mt-2 text-[12px] text-[#64748B]">Monthly amortised: <span className="font-semibold">{formatInr(laptop / 36)}</span> (÷36 months)</p>
      </Card>
      <Card className="p-4">
        <SectionTitle>Overhead</SectionTitle>
        <div className="mt-2 flex items-center gap-2"><Switch checked={manual} onCheckedChange={setManual} /><span className="text-[13px]">{manual ? "Manual override" : "Auto (10% of salary)"}</span></div>
        {manual && <div className="mt-2 w-48"><Label>Manual Overhead (₹)</Label><Input type="number" value={overhead} onChange={(e) => setOverhead(Number(e.target.value))} /></div>}
      </Card>
      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
    </div>
  );
}

function AssetsTab({ resourceId, assets, onSaved }: { resourceId: string; assets: Asset[]; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Asset | null>(null);
  return (
    <div>
      <div className="mb-2 flex justify-end"><Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> Add Asset</Button></div>
      <Card className="p-4">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Type</th><th>Description</th><th>Serial No</th><th>Issue Date</th><th>Return Date</th><th>Status</th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => { setEditing(a); setOpen(true); }}>
                <td className="py-2">{a.assetType}</td><td>{a.description ?? "—"}</td><td className="font-mono text-[11px]">{a.serialNumber ?? "—"}</td>
                <td>{formatDate(a.issueDate)}</td><td>{formatDate(a.returnDate)}</td><td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <AssetModal open={open} onOpenChange={setOpen} resourceId={resourceId} editing={editing} onSaved={onSaved} />
    </div>
  );
}

function AssetModal({ open, onOpenChange, resourceId, editing, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; resourceId: string; editing: Asset | null; onSaved: () => void }) {
  const [form, setForm] = React.useState({ assetType: "LAPTOP", description: "", serialNumber: "", issueDate: "", returnDate: "", status: "ISSUED" });
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (open) setForm(editing
      ? { assetType: editing.assetType, description: editing.description ?? "", serialNumber: editing.serialNumber ?? "", issueDate: editing.issueDate.slice(0, 10), returnDate: editing.returnDate?.slice(0, 10) ?? "", status: editing.status }
      : { assetType: "LAPTOP", description: "", serialNumber: "", issueDate: new Date().toISOString().slice(0, 10), returnDate: "", status: "ISSUED" });
  }, [open, editing]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, description: form.description || null, serialNumber: form.serialNumber || null, returnDate: form.returnDate || null };
      if (editing) await apiSend(`/api/resources/${resourceId}/assets/${editing.id}`, "PATCH", body);
      else await apiSend(`/api/resources/${resourceId}/assets`, "POST", body);
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit Asset" : "Add Asset"}>
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.assetType} onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}>{["LAPTOP", "CHARGER", "MOUSE", "KEYBOARD", "MONITOR", "HEADSET", "OTHER"].map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
            <div><Label>Status</Label><Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{["ISSUED", "RETURNED", "LOST"].map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Serial Number</Label><Input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} /></div>
            <div><Label>Issue Date</Label><Input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} /></div>
            <div><Label>Return Date</Label><Input type="date" value={form.returnDate} onChange={(e) => setForm((f) => ({ ...f, returnDate: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.issueDate}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentsTab({ resourceId, assignments, onSaved }: { resourceId: string; assignments: Assignment[]; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ clientId: "", serviceId: "", assignedFrom: "", assignedTo: "" });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resourceId}/assignments`, "POST", { ...form, assignedTo: form.assignedTo || null });
      onSaved(); setOpen(false); setForm({ clientId: "", serviceId: "", assignedFrom: "", assignedTo: "" });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-2 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={14} /> Assign to Client</Button></div>
      <Card className="p-4">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Client</th><th>Service</th><th>From</th><th>To</th><th>Status</th></tr></thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-b border-[#E8ECF4]">
                <td className="py-2 font-medium">{a.client.name}</td><td className="font-mono text-[11px]">{a.service.code}</td>
                <td>{formatDate(a.assignedFrom)}</td><td>{formatDate(a.assignedTo)}</td>
                <td><StatusBadge status={a.assignedTo && new Date(a.assignedTo) < new Date() ? "TERMED" : "ACTIVE"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Assign to Client">
          <DialogBody>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Client</Label><Select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}><option value="">Select…</option>{ref?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
              <div className="col-span-2"><Label>Service</Label><Select value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}><option value="">Select…</option>{ref?.services.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</Select></div>
              <div><Label>Assigned From</Label><Input type="date" value={form.assignedFrom} onChange={(e) => setForm((f) => ({ ...f, assignedFrom: e.target.value }))} /></div>
              <div><Label>Assigned To</Label><Input type="date" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} /></div>
            </div>
          </DialogBody>
          <DialogFooter><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.clientId || !form.serviceId || !form.assignedFrom}>{saving ? "Saving…" : "Assign"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddRevisionButton({ resourceId, onSaved }: { resourceId: string; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ effectiveFrom: "", baseSalary: 0, incentive: 0, allowance: 0, workingDays: [1, 2, 3, 4, 5], dailyWorkHours: 8 });
  const [saving, setSaving] = React.useState(false);
  const toggleDay = (i: number) => setForm((f) => ({ ...f, workingDays: f.workingDays.includes(i) ? f.workingDays.filter((d) => d !== i) : [...f.workingDays, i].sort() }));

  const save = async () => {
    setSaving(true);
    try { await apiSend(`/api/resources/${resourceId}/revisions`, "POST", { ...form, baseSalary: Number(form.baseSalary) }); onSaved(); setOpen(false); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus size={13} /> Add Revision</Button>
      <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogFooter><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.effectiveFrom || !form.baseSalary}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChangeStatusModal({ open, onOpenChange, resource, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; resource: ResourceData; onSaved: () => void }) {
  const [tab, setTab] = React.useState("termination");
  const [effectiveDate, setEffectiveDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState("");
  const [billable, setBillable] = React.useState(resource.isBillable);
  const [saving, setSaving] = React.useState(false);
  const isActive = resource.status === "ACTIVE";
  const activeAssignments = resource.assignments.filter((a) => !a.assignedTo || new Date(a.assignedTo) >= new Date()).length;

  const doTermToggle = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/resources/${resource.id}/status`, "POST", isActive
        ? { type: "TERMINATION", effectiveDate, reason: note }
        : { type: "REACTIVATION", effectiveDate, notes: note });
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };
  const doBillable = async () => {
    setSaving(true);
    try { await apiSend(`/api/resources/${resource.id}/status`, "POST", { type: "BILLABLE", isBillable: billable, effectiveDate, reason: note }); onSaved(); onOpenChange(false); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Change Status">
        <DialogBody>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="termination">{isActive ? "Termination" : "Reactivation"}</TabsTrigger>
              <TabsTrigger value="billable">Billable</TabsTrigger>
            </TabsList>
            <TabsContent value="termination">
              <p className="mb-3 text-[13px] font-semibold">{isActive ? "Terminate Employee" : "Reactivate Employee"}</p>
              <Label>Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              <div className="mt-3"><Label>{isActive ? "Reason (optional)" : "Notes (optional)"}</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <div className="mt-4 flex justify-end">
                <Button variant={isActive ? "danger" : "success"} onClick={doTermToggle} disabled={saving}>{isActive ? "Terminate" : "Reactivate"}</Button>
              </div>
            </TabsContent>
            <TabsContent value="billable">
              <p className="mb-2 text-[13px]">Currently: <span className="font-semibold">{resource.isBillable ? "Billable ✅" : "Non-billable"}</span></p>
              <div className="flex items-center gap-2"><Switch checked={billable} onCheckedChange={setBillable} /><span className="text-[13px]">{billable ? "Billable" : "Non-billable"}</span></div>
              <div className="mt-3"><Label>Effective Date</Label><Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
              <div className="mt-3"><Label>Reason / Notes</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
              {activeAssignments > 0 && !billable && (
                <div className="mt-3 rounded-[5px] bg-[#FAEEDA] px-3 py-2 text-[12px] text-[#633806]">⚠ Assigned to {activeAssignments} client(s). Changing to non-billable will exclude them from revenue share calculations.</div>
              )}
              <div className="mt-4 flex justify-end"><Button onClick={doBillable} disabled={saving}>Update Billable Status</Button></div>
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
