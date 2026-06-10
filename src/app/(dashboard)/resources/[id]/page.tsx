"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Plus } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkingDayChips } from "@/components/common/DayChips";
import { useReference } from "@/hooks/useReference";
import { RevisionModal } from "@/components/resources/RevisionModal";
import { ChangeStatusModal } from "@/components/resources/ChangeStatusModal";
import { AssetModal, type AssetEditing } from "@/components/resources/AssetModal";
import { AssignmentModal } from "@/components/resources/AssignmentModal";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatUsd, formatDate } from "@/lib/utils";

interface Revision { id: string; effectiveFrom: string; baseSalary: number; incentive: number; allowance: number; workingDays: number[]; dailyWorkHours: number }
type Asset = AssetEditing;
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
  const [revOpen, setRevOpen] = React.useState(false);
  const refresh = () => mutate();
  const latestRev = r?.revisions[0];
  const activeAssignments = (r?.assignments ?? []).filter((a) => !a.assignedTo || new Date(a.assignedTo) >= new Date()).length;

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
                    <KV k="Base Salary" v={formatInr(latestRev.baseSalary)} />
                    <KV k="Incentive" v={formatInr(latestRev.incentive)} />
                    <KV k="Allowance" v={formatInr(latestRev.allowance)} />
                    <KV k="Daily Hours" v={String(latestRev.dailyWorkHours)} />
                    <div className="flex justify-between"><dt className="text-[#94A3B8]">Working Days</dt><dd><WorkingDayChips days={latestRev.workingDays} /></dd></div>
                  </dl>
                ) : <p className="mt-2 text-[12px] text-[#64748B]">No revisions.</p>}
                <div className="mt-3"><Button size="sm" variant="secondary" onClick={() => setRevOpen(true)}><Plus size={13} /> Add Revision</Button></div>
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

      <RevisionModal open={revOpen} onOpenChange={setRevOpen} resourceId={params.id} onSaved={refresh} />
      {r && <ChangeStatusModal open={statusOpen} onOpenChange={setStatusOpen} resource={{ id: r.id, status: r.status, isBillable: r.isBillable, activeAssignments }} onSaved={refresh} />}
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
  const [editing, setEditing] = React.useState<AssetEditing | null>(null);
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

function AssignmentsTab({ resourceId, assignments, onSaved }: { resourceId: string; assignments: Assignment[]; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
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
      <AssignmentModal open={open} onOpenChange={setOpen} resourceId={resourceId} onSaved={onSaved} />
    </div>
  );
}
