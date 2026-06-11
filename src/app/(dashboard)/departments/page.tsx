"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Building2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/common/CurrencyDisplay";
import { CategoryBadge, CodeBadges, DEPT_CATEGORY_OPTIONS } from "@/components/common/StatusBadge";
import { DepartmentForm, type DepartmentEditing } from "@/components/departments/DepartmentForm";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";

type Row = {
  id: string;
  name: string;
  category: string;
  headId: string | null;
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
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentEditing | null>(null);

  const rows = (data?.data ?? []).filter((r) => {
    if (catF && r.category !== catF) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Department", cell: ({ getValue }) => <span className="font-semibold">{getValue() as string}</span> },
    { accessorKey: "category", header: "Category", cell: ({ getValue }) => <CategoryBadge category={getValue() as string} /> },
    { accessorKey: "headName", header: "Head", cell: ({ getValue }) => (getValue() as string) ?? <span className="text-[#94A3B8]">—</span> },
    { accessorKey: "activeResourceCount", header: "Active Resources", enableColumnFilter: false },
    { id: "services", header: "Services", enableColumnFilter: false, cell: ({ row }) => <CodeBadges codes={row.original.services} /> },
    { id: "cost", header: "Monthly Cost", enableColumnFilter: false, cell: ({ row }) => <Money inr={row.original.monthlyCostInr} usd={row.original.monthlyCostUsd} primary="INR" /> },
    { id: "surplus", header: "Surplus/(Deficit)", enableColumnFilter: false, cell: ({ row }) => <Money inr={row.original.surplusInr} usd={row.original.surplusUsd} primary="INR" negativeColors /> },
    {
      id: "actions",
      header: "Actions",
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { const d = row.original; setEditing({ id: d.id, name: d.name, category: d.category, headId: d.headId }); setOpen(true); }}><Pencil size={12} /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Departments"
      actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> Add Department</Button>}
      filterBar={
        <FilterBar>
          <FilterSelect value={catF} onChange={setCatF} placeholder="All Categories" options={DEPT_CATEGORY_OPTIONS} />
          <Input className="h-[30px] w-44" placeholder="Search department…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
      <DepartmentForm open={open} onOpenChange={setOpen} editing={editing} onSaved={() => mutate()} />
    </PageShell>
  );
}
