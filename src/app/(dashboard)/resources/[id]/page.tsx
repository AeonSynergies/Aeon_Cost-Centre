"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Plus, Pencil, Trash2, ArrowLeftRight } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/common/Avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatusPills } from "@/components/common/StatusPills";
import { WorkingDayChips } from "@/components/common/DayChips";
import { useReference } from "@/hooks/useReference";
import { RevisionModal } from "@/components/resources/RevisionModal";
import { ChangeStatusModal } from "@/components/resources/ChangeStatusModal";
import { AssetModal, type AssetEditing } from "@/components/resources/AssetModal";
import { AssignmentModal } from "@/components/resources/AssignmentModal";
import { TransferModal, type TransferTarget } from "@/components/resources/TransferModal";
import { ExtraCostModal, type ExtraCostEditing } from "@/components/resources/ExtraCostModal";
import { AddToolCostModal } from "@/components/expenses/AddToolCostModal";
import { ResourceEditModal, type ResourceEditing } from "@/components/resources/ResourceEditModal";
import { AssignmentEditModal, type AssignmentEditing } from "@/components/resources/AssignmentEditModal";
import { RevisionEditModal, type RevisionEditing } from "@/components/resources/RevisionEditModal";
import { UtilBar } from "@/components/common/UtilBar";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";
import { useOpsStore } from "@/store/filterStore";
import { formatInr, formatUsd, formatDate } from "@/lib/utils";

interface Revision { id: string; effectiveFrom: string; baseSalary: number; incentive: number; allowance: number; workingDays: number[]; dailyWorkHours: number }
type Asset = AssetEditing;
type ExtraCost = ExtraCostEditing;
interface Assignment { id: string; client: { id: string; name: string }; service: { id: string; code: string; name: string }; assignedFrom: string; assignedTo: string | null }
interface ResourceData {
  id: string; employeeNumber: string; name: string; title: string; isBillable: boolean; status: string;
  joinedDate: string; terminatedDate: string | null; laptopCostInr: number | null; laptopIssueDate: string | null; overheadManual: number | null;
  department: { id: string; name: string }; costCentre: { id: string; name: string; ms365RateInr: number; zoomRateUsd: number };
  headOfDept: { id: string; name: string }[];
  revisions: Revision[]; assets: Asset[]; extraCosts: ExtraCost[]; assignments: Assignment[];
}
interface Cost { baseSalary: number; incentive: number; allowance: number; overhead: number; laptopAmortised: number; ms365Cost: number; zoomCost: number; extraMonthly: number; totalCostInr: number; totalCostUsd: number }

export default function ResourceDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, mutate } = useSWR<{ data: ResourceData; cost: Cost; utilByClient: Record<string, number> }>(`/api/resources/${params.id}?year=${periodYear}&month=${periodMonth}`, apiGet);
  const r = data?.data;
  const cost = data?.cost;
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [revOpen, setRevOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRev, setEditRev] = React.useState<RevisionEditing | null>(null);
  const [editRevOpen, setEditRevOpen] = React.useState(false);
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
        <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
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
            <>
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle>Salary &amp; Schedule</SectionTitle>
                <Button size="sm" onClick={() => setRevOpen(true)}><Plus size={13} /> Add Revision</Button>
              </div>
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
                </Card>

                <Card className="p-4">
                  <SectionTitle>Cost Breakdown (period)</SectionTitle>
                  <dl className="mt-2 space-y-1 text-[12px]">
                    <KV k="Base Salary" v={formatInr(cost.baseSalary)} />
                    <KV k="Incentive" v={formatInr(cost.incentive)} />
                    <KV k="Allowance" v={formatInr(cost.allowance)} />
                    <KV k="Overhead" v={formatInr(cost.overhead)} />
                    {/* Tool costs only appear when the resource has extra-cost records. */}
                    {r.extraCosts.length > 0 && <KV k="MS365" v={formatInr(cost.ms365Cost)} />}
                    {r.extraCosts.length > 0 && <KV k="Zoom" v={formatInr(cost.zoomCost)} />}
                    {cost.laptopAmortised > 0 && <KV k="Laptop (from Assets)" v={`${formatInr(cost.laptopAmortised)} (${formatInr(cost.laptopAmortised * 36)} ÷ 36)`} />}
                    <KV k="Extra Costs (monthly)" v={formatInr(cost.extraMonthly)} />
                    <div className="flex justify-between border-t border-[#E8ECF4] pt-1 font-semibold"><dt>Total Cost</dt><dd>{formatInr(cost.totalCostInr)} <span className="text-[#94A3B8]">({formatUsd(cost.totalCostUsd)})</span></dd></div>
                  </dl>
                </Card>

                <Card className="p-4 lg:col-span-2">
                  <SectionTitle>Revision History</SectionTitle>
                  <table className="mt-2 w-full text-[12px]">
                    <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Effective From</th><th>Base (₹)</th><th>Incentive</th><th>Allowance</th><th>Working Days</th><th>Hrs/Day</th><th></th></tr></thead>
                    <tbody>
                      {r.revisions.map((rev) => (
                        <tr key={rev.id} className="border-b border-[#E8ECF4]">
                          <td className="py-2">{formatDate(rev.effectiveFrom)}</td>
                          <td>{formatInr(rev.baseSalary)}</td><td>{formatInr(rev.incentive)}</td><td>{formatInr(rev.allowance)}</td>
                          <td><WorkingDayChips days={rev.workingDays} /></td><td>{rev.dailyWorkHours}</td>
                          <td className="py-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditRev({ id: rev.id, resourceId: params.id, effectiveFrom: rev.effectiveFrom, baseSalary: rev.baseSalary, incentive: rev.incentive, allowance: rev.allowance, workingDays: rev.workingDays, dailyWorkHours: rev.dailyWorkHours }); setEditRevOpen(true); }}><Pencil size={12} /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="extra">{r && <ExtraCostsTab resource={r} onSaved={refresh} />}</TabsContent>
        <TabsContent value="assets">{r && <AssetsTab resourceId={params.id} assets={r.assets} onSaved={refresh} />}</TabsContent>
        <TabsContent value="assignments">{r && <AssignmentsTab resourceId={params.id} assignments={r.assignments} utilByClient={data?.utilByClient ?? {}} onSaved={refresh} />}</TabsContent>
      </Tabs>

      <RevisionModal
        open={revOpen}
        onOpenChange={setRevOpen}
        resourceId={params.id}
        latest={latestRev ? { baseSalary: latestRev.baseSalary, incentive: latestRev.incentive, allowance: latestRev.allowance, workingDays: latestRev.workingDays, dailyWorkHours: latestRev.dailyWorkHours } : undefined}
        onSaved={refresh}
      />
      {r && <ChangeStatusModal open={statusOpen} onOpenChange={setStatusOpen} resource={{ id: r.id, status: r.status, isBillable: r.isBillable, activeAssignments }} onSaved={refresh} />}
      {r && <ResourceEditModal open={editOpen} onOpenChange={setEditOpen} resource={{ id: r.id, employeeNumber: r.employeeNumber, name: r.name, title: r.title, departmentId: r.department.id, costCentreId: r.costCentre.id, isBillable: r.isBillable }} onSaved={refresh} />}
      <RevisionEditModal open={editRevOpen} onOpenChange={setEditRevOpen} editing={editRev} onSaved={refresh} />
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
  const save = async () => { setSaving(true); try { await apiSend(`/api/resources/${resource.id}`, "PATCH", form); toast("Profile updated"); onSaved(); } finally { setSaving(false); } };
  return (
    <Card className="max-w-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
        <div><Label>Department</Label><Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>{ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
        <div><Label>Cost Centre</Label><Select value={form.costCentreId} onChange={(e) => setForm((f) => ({ ...f, costCentreId: e.target.value }))}>{ref?.costCentres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div className="col-span-2 flex items-center gap-2"><Switch checked={form.isBillable} onCheckedChange={(v) => setForm((f) => ({ ...f, isBillable: v }))} /><span className="text-[13px]">Billable</span></div>
      </div>
      {resource.headOfDept.length > 0 && (
        <div className="mt-3 rounded-[7px] bg-[#EEF4FB] px-3 py-2 text-[12px] text-[#3266AD]">
          Department Head of: <span className="font-semibold">{resource.headOfDept.map((d) => d.name).join(", ")}</span>
        </div>
      )}
      <div className="mt-3 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button></div>
    </Card>
  );
}

function ExtraCostsTab({ resource, onSaved }: { resource: ResourceData; onSaved: () => void }) {
  const [manual, setManual] = React.useState<boolean>(resource.overheadManual != null);
  const [overhead, setOverhead] = React.useState(resource.overheadManual ?? 0);
  const [savingOverhead, setSavingOverhead] = React.useState(false);
  const [costOpen, setCostOpen] = React.useState(false);
  const [toolOpen, setToolOpen] = React.useState(false);
  const [editingCost, setEditingCost] = React.useState<ExtraCostEditing | null>(null);

  const saveOverhead = async () => {
    setSavingOverhead(true);
    try { await apiSend(`/api/resources/${resource.id}`, "PATCH", { overheadManual: manual ? Number(overhead) : null }); toast("Overhead saved"); onSaved(); }
    finally { setSavingOverhead(false); }
  };
  const delCost = async (id: string) => { await apiSend(`/api/resources/${resource.id}/extra-costs/${id}`, "DELETE"); toast("Extra cost removed"); onSaved(); };

  return (
    <div className="grid gap-3">
      <div className="rounded-[7px] bg-[#EEF4FB] px-3 py-2 text-[11px] text-[#3266AD]">Laptop cost is now sourced from the Assets tab — add a laptop there and its amortisation flows into the cost breakdown automatically.</div>

      <Card className="max-w-2xl p-4">
        <SectionTitle>Overhead</SectionTitle>
        <div className="mt-2 flex items-center gap-2"><Switch checked={manual} onCheckedChange={setManual} /><span className="text-[13px]">{manual ? "Manual override" : "Auto (10% of base salary)"}</span></div>
        {manual && <div className="mt-2 w-48"><Label>Manual Overhead (₹/month)</Label><Input type="number" value={overhead} onChange={(e) => setOverhead(Number(e.target.value))} /></div>}
        <div className="mt-2 flex justify-end"><Button size="sm" onClick={saveOverhead} disabled={savingOverhead}>{savingOverhead ? "Saving…" : "Save"}</Button></div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <SectionTitle>Extra Costs</SectionTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setToolOpen(true)}><Plus size={13} /> Add Tool Cost</Button>
            <Button size="sm" onClick={() => { setEditingCost(null); setCostOpen(true); }}><Plus size={13} /> Add Extra Cost</Button>
          </div>
        </div>
        <table className="mt-2 w-full text-[12px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Description</th><th>Category</th><th>Amount (₹)</th><th>Frequency</th><th>From</th><th>To</th><th></th></tr></thead>
          <tbody>
            {resource.extraCosts.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-[#94A3B8]">No extra costs.</td></tr>}
            {resource.extraCosts.map((c) => (
              <tr key={c.id} className="border-b border-[#E8ECF4]">
                <td className="py-2 font-medium">{c.description}</td>
                <td>{c.category}</td>
                <td>{formatInr(c.amountInr)}</td>
                <td>{c.frequency === "MONTHLY" ? "Monthly" : "One-time"}</td>
                <td>{formatDate(c.effectiveFrom)}</td>
                <td>{formatDate(c.effectiveTo)}</td>
                <td className="flex gap-1 py-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingCost(c); setCostOpen(true); }}><Pencil size={12} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => delCost(c.id)}><Trash2 size={12} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ExtraCostModal open={costOpen} onOpenChange={setCostOpen} resourceId={resource.id} editing={editingCost} onSaved={onSaved} />
      <AddToolCostModal open={toolOpen} onOpenChange={setToolOpen} resourceId={resource.id} onSaved={onSaved} />
    </div>
  );
}

function AssetsTab({ resourceId, assets, onSaved }: { resourceId: string; assets: Asset[]; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AssetEditing | null>(null);
  const [filter, setFilter] = React.useState("active");
  const shown = assets.filter((a) => (filter === "active" ? a.status === "ISSUED" : true));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <StatusPills value={filter} onChange={setFilter} options={[
          { value: "active", label: "Active", count: assets.filter((a) => a.status === "ISSUED").length },
          { value: "all", label: "All", count: assets.length },
        ]} />
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> Add Asset</Button>
      </div>
      <Card className="p-4">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Type</th><th>Description</th><th>Serial No</th><th>Cost (₹)</th><th>Issue Date</th><th>Return Date</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => { setEditing(a); setOpen(true); }}>
                <td className="py-2">{a.assetType}</td><td>{a.description ?? "—"}</td><td className="font-mono text-[11px]">{a.serialNumber ?? "—"}</td>
                <td>{a.costInr != null ? formatInr(a.costInr) : "—"}</td>
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

function AssignmentsTab({ resourceId, assignments, utilByClient, onSaved }: { resourceId: string; assignments: Assignment[]; utilByClient: Record<string, number>; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [target, setTarget] = React.useState<TransferTarget | null>(null);
  const [editAssign, setEditAssign] = React.useState<AssignmentEditing | null>(null);
  const [editAssignOpen, setEditAssignOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("active");
  const isActive = (a: Assignment) => !a.assignedTo || new Date(a.assignedTo) >= new Date();
  const shown = assignments.filter((a) => (filter === "active" ? isActive(a) : filter === "ended" ? !isActive(a) : true));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <StatusPills value={filter} onChange={setFilter} options={[
          { value: "active", label: "Active", count: assignments.filter(isActive).length },
          { value: "ended", label: "Ended", count: assignments.filter((a) => !isActive(a)).length },
          { value: "all", label: "All", count: assignments.length },
        ]} />
        <Button onClick={() => setOpen(true)}><Plus size={14} /> Assign to Client</Button>
      </div>
      <Card className="p-4">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Client</th><th>Service</th><th>From</th><th>To</th><th>Utilisation</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id} className="border-b border-[#E8ECF4]">
                <td className="py-2 font-medium">{a.client.name}</td><td className="font-mono text-[11px]">{a.service.code}</td>
                <td>{formatDate(a.assignedFrom)}</td><td>{formatDate(a.assignedTo)}</td>
                <td>{utilByClient[a.client.id] !== undefined ? <UtilBar pct={utilByClient[a.client.id]} /> : <span className="text-[#94A3B8]">—</span>}</td>
                <td><StatusBadge status={isActive(a) ? "ACTIVE" : "TERMED"} /></td>
                <td className="flex gap-1 py-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditAssign({ id: a.id, resourceId, clientName: a.client.name, serviceLabel: `${a.service.code} — ${a.service.name}`, assignedFrom: a.assignedFrom, assignedTo: a.assignedTo }); setEditAssignOpen(true); }}><Pencil size={12} /></Button>
                  {isActive(a) && (
                    <Button size="sm" variant="ghost" onClick={() => { setTarget({ assignmentId: a.id, resourceId, clientName: a.client.name, serviceLabel: `${a.service.code} — ${a.service.name}` }); setTransferOpen(true); }}>
                      <ArrowLeftRight size={12} /> Transfer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <AssignmentModal open={open} onOpenChange={setOpen} resourceId={resourceId} onSaved={onSaved} />
      <TransferModal open={transferOpen} onOpenChange={setTransferOpen} target={target} onSaved={onSaved} />
      <AssignmentEditModal open={editAssignOpen} onOpenChange={setEditAssignOpen} editing={editAssign} onSaved={onSaved} />
    </div>
  );
}
