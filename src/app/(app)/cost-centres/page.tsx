"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Boxes } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/shell/PageShell";
import { FilterBar, FilterSelect } from "@/components/shell/FilterBar";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { useReference } from "@/components/ui/bits";
import { apiGet, apiSend } from "@/lib/api-client";
import { formatInr, formatUsd } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  ms365RateInr: number;
  zoomRateUsd: number;
  resourceCount: number;
};

export default function CostCentresPage() {
  const { data: ref } = useReference();
  const { data, isLoading, mutate } = useSWR<{ data: Row[] }>("/api/cost-centres", apiGet);
  const [deptF, setDeptF] = React.useState("");
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [open, setOpen] = React.useState(false);

  const rows = (data?.data ?? []).filter((r) => !deptF || r.departmentId === deptF);

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: "departmentName", header: "Department", cell: ({ getValue }) => (getValue() as string) ?? <span className="text-[#94A3B8]">—</span> },
    { accessorKey: "ms365RateInr", header: "MS365 (₹/seat)", enableColumnFilter: false, cell: ({ getValue }) => formatInr(getValue() as number) },
    { accessorKey: "zoomRateUsd", header: "Zoom ($/seat)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "resourceCount", header: "Resources", enableColumnFilter: false },
  ];

  return (
    <PageShell
      title="Cost Centres"
      actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> Add Cost Centre</Button>}
      filterBar={
        <FilterBar>
          <FilterSelect value={deptF} onChange={setDeptF} placeholder="All Departments" options={(ref?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        </FilterBar>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        onRowClick={(r) => { setEditing(r); setOpen(true); }}
        empty={{ icon: <Boxes size={32} />, heading: "No cost centres", cta: <Button onClick={() => setOpen(true)}><Plus size={14} /> Add Cost Centre</Button> }}
      />
      <CostCentreModal open={open} onOpenChange={setOpen} editing={editing} onSaved={() => mutate()} />
    </PageShell>
  );
}

function CostCentreModal({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Row | null;
  onSaved: () => void;
}) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ name: "", departmentId: "", ms365RateInr: 0, zoomRateUsd: 0 });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        editing
          ? { name: editing.name, departmentId: editing.departmentId ?? "", ms365RateInr: editing.ms365RateInr, zoomRateUsd: editing.zoomRateUsd }
          : { name: "", departmentId: "", ms365RateInr: 0, zoomRateUsd: 0 }
      );
    }
  }, [open, editing]);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const body = { ...form, departmentId: form.departmentId || null, ms365RateInr: Number(form.ms365RateInr), zoomRateUsd: Number(form.zoomRateUsd) };
      if (editing) await apiSend(`/api/cost-centres/${editing.id}`, "PATCH", body);
      else await apiSend("/api/cost-centres", "POST", body);
      onSaved(); onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit Cost Centre" : "Add Cost Centre"}>
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Department</Label>
              <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
                <option value="">None</option>
                {ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>MS365 Rate (₹)</Label>
              <Input type="number" value={form.ms365RateInr} onChange={(e) => setForm((f) => ({ ...f, ms365RateInr: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Zoom Rate ($)</Label>
              <Input type="number" value={form.zoomRateUsd} onChange={(e) => setForm((f) => ({ ...f, zoomRateUsd: Number(e.target.value) }))} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.name}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
