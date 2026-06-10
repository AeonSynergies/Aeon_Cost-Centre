"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Building2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/shell/PageShell";
import { FilterBar, FilterSelect } from "@/components/shell/FilterBar";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { CategoryBadge, CodeBadges, useReference } from "@/components/ui/bits";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/lib/store";

type Row = {
  id: string;
  name: string;
  category: string;
  headName: string | null;
  activeResourceCount: number;
  services: string[];
  monthlyCostInr: number;
  monthlyCostUsd: number;
  surplusInr: number;
  surplusUsd: number;
};

export default function DepartmentsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, isLoading, mutate } = useSWR<{ data: Row[] }>(`/api/departments?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [catF, setCatF] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const rows = (data?.data ?? []).filter((r) => !catF || r.category === catF);

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Department", cell: ({ getValue }) => <span className="font-semibold">{getValue() as string}</span> },
    { accessorKey: "category", header: "Category", cell: ({ getValue }) => <CategoryBadge category={getValue() as string} /> },
    { accessorKey: "headName", header: "Head", cell: ({ getValue }) => (getValue() as string) ?? <span className="text-[#94A3B8]">—</span> },
    { accessorKey: "activeResourceCount", header: "Active Resources", enableColumnFilter: false },
    { id: "services", header: "Services", enableColumnFilter: false, cell: ({ row }) => <CodeBadges codes={row.original.services} /> },
    { id: "cost", header: "Monthly Cost", enableColumnFilter: false, cell: ({ row }) => <Money inr={row.original.monthlyCostInr} usd={row.original.monthlyCostUsd} primary="INR" /> },
    { id: "surplus", header: "Surplus/(Deficit)", enableColumnFilter: false, cell: ({ row }) => <Money inr={row.original.surplusInr} usd={row.original.surplusUsd} primary="INR" negativeColors /> },
  ];

  return (
    <PageShell
      title="Departments"
      actions={<Button onClick={() => setOpen(true)}><Plus size={14} /> Add Department</Button>}
      filterBar={
        <FilterBar>
          <FilterSelect value={catF} onChange={setCatF} placeholder="All Categories" options={[
            { value: "CLIENT_FACING", label: "Client-facing" },
            { value: "BUSINESS_DEVELOPMENT", label: "Business Development" },
            { value: "PRODUCT_DEVELOPMENT", label: "Product Development" },
          ]} />
        </FilterBar>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        onRowClick={(r) => router.push(`/departments/${r.id}`)}
        empty={{ icon: <Building2 size={32} />, heading: "No departments", cta: <Button onClick={() => setOpen(true)}><Plus size={14} /> Add Department</Button> }}
      />
      <DepartmentAddModal open={open} onOpenChange={setOpen} onSaved={() => mutate()} />
    </PageShell>
  );
}

function DepartmentAddModal({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ name: "", category: "CLIENT_FACING", headId: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { if (open) { setForm({ name: "", category: "CLIENT_FACING", headId: "" }); setError(null); } }, [open]);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await apiSend("/api/departments", "POST", { ...form, headId: form.headId || null });
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add Department">
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Department Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="CLIENT_FACING">Client-facing</option>
                <option value="BUSINESS_DEVELOPMENT">Business Development</option>
                <option value="PRODUCT_DEVELOPMENT">Product Development</option>
              </Select>
            </div>
            <div><Label>Head</Label>
              <Select value={form.headId} onChange={(e) => setForm((f) => ({ ...f, headId: e.target.value }))}>
                <option value="">None</option>
                {ref?.resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
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
