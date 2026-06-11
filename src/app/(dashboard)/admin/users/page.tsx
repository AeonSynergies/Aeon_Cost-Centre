"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Pencil, Shield } from "lucide-react";
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
          <Button size="sm" variant="ghost" onClick={() => { setEditing(row.original); setOpen(true); }}><Pencil size={12} /></Button>
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
      <UserModal open={open} onOpenChange={setOpen} editing={editing} onSaved={() => mutate()} />
    </PageShell>
  );
}

function UserModal({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Row | null; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "", role: "VIEWER", departmentId: "", isActive: true });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setForm(editing
        ? { name: editing.name, email: editing.email, password: "", confirm: "", role: editing.role, departmentId: editing.departmentId ?? "", isActive: editing.isActive }
        : { name: "", email: "", password: "", confirm: "", role: "VIEWER", departmentId: "", isActive: true });
    }
  }, [open, editing]);

  const save = async () => {
    if (!editing && form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password && form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.role === "MANAGER" && !form.departmentId) { setError("Department required for Manager"); return; }
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, departmentId: form.departmentId || null, isActive: form.isActive };
      if (form.password) body.password = form.password;
      if (editing) await apiSend(`/api/admin/users/${editing.id}`, "PATCH", body);
      else await apiSend("/api/admin/users", "POST", { ...body, password: form.password });
      toast(editing ? "User updated" : "User created");
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit User" : "Add User"}>
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email *</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>{editing ? "New Password (optional)" : "Password *"}</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div><Label>Confirm Password</Label><Input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} /></div>
            <div><Label>Role *</Label><Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{["ADMIN", "MANAGER", "FINANCE", "VIEWER"].map((r) => <option key={r} value={r}>{r}</option>)}</Select></div>
            <div><Label>Department{form.role === "MANAGER" ? " *" : ""}</Label><Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}><option value="">None</option>{ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
            <div className="col-span-2 flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} /><span className="text-[13px]">Active</span></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.email}>{saving ? "Saving…" : editing ? "Update User" : "Create User"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
