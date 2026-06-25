"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Pencil, Shield, KeyRound, Copy } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { StatusPills } from "@/components/common/StatusPills";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useReference } from "@/hooks/useReference";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";
import { formatDate } from "@/lib/utils";

type Row = { id: string; name: string; email: string; role: string; departmentId: string | null; departmentName: string | null; isActive: boolean; lastLoginAt: string | null };

const ROLE_TONE: Record<string, "info" | "purple" | "warning" | "neutral"> = { ADMIN: "purple", MANAGER: "info", FINANCE: "warning", VIEWER: "neutral" };

export default function UsersPage() {
  const { data, isLoading, mutate } = useSWR<{ data: Row[] }>("/api/admin/users", apiGet);
  const [roleF, setRoleF] = React.useState("");
  const [statusF, setStatusF] = React.useState("active");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [resetTarget, setResetTarget] = React.useState<Row | null>(null);
  const [resetting, setResetting] = React.useState(false);
  const [linkInfo, setLinkInfo] = React.useState<{ name: string; url: string; kind: "invite" | "reset" } | null>(null);

  const confirmReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await apiSend<{ resetUrl: string }>(`/api/admin/users/${resetTarget.id}/reset-password`, "POST");
      setLinkInfo({ name: resetTarget.name, url: res.resetUrl, kind: "reset" });
      setResetTarget(null);
    } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setResetting(false); }
  };

  const all = data?.data ?? [];
  const statusCounts = {
    all: all.length,
    active: all.filter((r) => r.isActive).length,
    inactive: all.filter((r) => !r.isActive).length,
  };
  const rows = all.filter((r) => {
    if (roleF && r.role !== roleF) return false;
    if (statusF === "active" && !r.isActive) return false;
    if (statusF === "inactive" && r.isActive) return false;
    return true;
  });

  const toggleActive = async (r: Row) => { await apiSend(`/api/admin/users/${r.id}`, "PATCH", { isActive: !r.isActive }); toast(r.isActive ? "User deactivated" : "User reactivated"); mutate(); };

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: "email", header: "Email", cell: ({ getValue }) => <span className="font-mono text-[11px]">{getValue() as string}</span> },
    { accessorKey: "role", header: "Role", cell: ({ getValue }) => <Badge tone={ROLE_TONE[getValue() as string] ?? "neutral"}>{getValue() as string}</Badge> },
    { accessorKey: "departmentName", header: "Department", cell: ({ getValue }) => (getValue() as string) ?? "—" },
    { accessorKey: "isActive", header: "Status", cell: ({ getValue }) => <Badge tone={getValue() ? "success" : "error"}>{getValue() ? "Active" : "Inactive"}</Badge> },
    { accessorKey: "lastLoginAt", header: "Last Login", enableColumnFilter: false, cell: ({ getValue }) => formatDate(getValue() as string | null) },
    {
      id: "actions", header: "Actions", enableColumnFilter: false,
      cell: ({ row }) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditing(row.original); setOpen(true); }}><Pencil size={12} /></Button>
          <Button size="sm" variant="ghost" title="Reset Password" onClick={() => setResetTarget(row.original)}><KeyRound size={12} /></Button>
          <Button size="sm" variant="ghost" onClick={() => toggleActive(row.original)}>{row.original.isActive ? "Deactivate" : "Reactivate"}</Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Users"
      actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> Add User</Button>}
      filterBar={
        <FilterBar>
          <StatusPills
            value={statusF}
            onChange={setStatusF}
            options={[
              { value: "all", label: "All", count: statusCounts.all },
              { value: "active", label: "Active", count: statusCounts.active },
              { value: "inactive", label: "Inactive", count: statusCounts.inactive },
            ]}
          />
          <FilterSelect value={roleF} onChange={setRoleF} placeholder="All Roles" options={["ADMIN", "MANAGER", "FINANCE", "VIEWER"].map((r) => ({ value: r, label: r }))} />
        </FilterBar>
      }
    >
      <DataTable columns={columns} data={rows} loading={isLoading}
        empty={{ icon: <Shield size={32} />, heading: "No users", cta: <Button onClick={() => setOpen(true)}><Plus size={14} /> Add User</Button> }} />
      <UserModal open={open} onOpenChange={setOpen} editing={editing} onSaved={() => mutate()} onInvited={(name, url) => setLinkInfo({ name, url, kind: "invite" })} />

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent title="Reset Password" width={440}>
          <DialogBody><p className="text-[13px] text-[#475569]">Send a password reset link to <span className="font-semibold">{resetTarget?.email}</span>?</p></DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button onClick={confirmReset} disabled={resetting}>{resetting ? "Generating…" : "Send Reset Link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkInfo} onOpenChange={(o) => !o && setLinkInfo(null)}>
        <DialogContent title={linkInfo?.kind === "reset" ? "Reset Link Generated" : "Invite Sent"} width={480}>
          <DialogBody>
            <p className="text-[13px] text-[#475569]">{linkInfo?.kind === "reset" ? `Reset link generated! Share this with ${linkInfo?.name}:` : `Invite sent! Share this link with ${linkInfo?.name}:`}</p>
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={linkInfo?.url ?? ""} className="h-[32px] flex-1 rounded-[7px] border border-[#E8ECF4] bg-[#F8F9FC] px-2 text-[12px] text-[#0F1629] outline-none" onFocus={(e) => e.currentTarget.select()} />
              <Button size="sm" variant="secondary" onClick={() => { if (linkInfo) { navigator.clipboard?.writeText(linkInfo.url); toast("Link copied"); } }}><Copy size={13} /></Button>
            </div>
            <p className="mt-2 text-[11px] text-[#94A3B8]">This link expires in 48 hours.</p>
          </DialogBody>
          <DialogFooter><Button onClick={() => setLinkInfo(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function UserModal({ open, onOpenChange, editing, onSaved, onInvited }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Row | null; onSaved: () => void; onInvited: (name: string, url: string) => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ name: "", email: "", role: "VIEWER", departmentId: "", isActive: true });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setForm(editing
        ? { name: editing.name, email: editing.email, role: editing.role, departmentId: editing.departmentId ?? "", isActive: editing.isActive }
        : { name: "", email: "", role: "VIEWER", departmentId: "", isActive: true });
    }
  }, [open, editing]);

  const save = async () => {
    if (form.role === "MANAGER" && !form.departmentId) { setError("Department required for Manager"); return; }
    setSaving(true); setError(null);
    try {
      const body = { name: form.name, email: form.email, role: form.role, departmentId: form.departmentId || null, isActive: form.isActive };
      if (editing) {
        await apiSend(`/api/admin/users/${editing.id}`, "PATCH", body);
        toast("User updated");
      } else {
        const res = await apiSend<{ inviteUrl: string }>("/api/admin/users", "POST", body);
        toast("User invited");
        onInvited(form.name, res.inviteUrl);
      }
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit User" : "Add User"}>
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          {!editing && <div className="mb-3 rounded-[5px] bg-[#EEF4FB] px-3 py-2 text-[12px] text-[#3266AD]">No password needed — the user sets their own via an invite link generated on save.</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email *</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Role *</Label><Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{["ADMIN", "MANAGER", "FINANCE", "VIEWER"].map((r) => <option key={r} value={r}>{r}</option>)}</Select></div>
            <div><Label>Department{form.role === "MANAGER" ? " *" : ""}</Label><Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}><option value="">None</option>{ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
            <div className="col-span-2 flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} /><span className="text-[13px]">Active</span></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.email}>{saving ? "Saving…" : editing ? "Update User" : "Send Invite"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
