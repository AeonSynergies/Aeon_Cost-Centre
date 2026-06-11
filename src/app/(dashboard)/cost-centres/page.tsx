"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Boxes, Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar } from "@/components/common/FilterBar";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { CostCentreForm, type CostCentreEditing } from "@/components/cost-centres/CostCentreForm";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  departmentId: string | null;
  resourceCount: number;
  departmentCount: number;
  expensesInr: number;
  resourceCostInr: number;
  departmentCostsInr: number;
  totalCostInr: number;
};

export default function CostCentresPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, isLoading, mutate } = useSWR<{ data: Row[] }>(`/api/cost-centres?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CostCentreEditing | null>(null);

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Cost Centre Name", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: "resourceCount", header: "No. of Resources", enableColumnFilter: false },
    { accessorKey: "departmentCount", header: "No. of Departments", enableColumnFilter: false },
    { accessorKey: "expensesInr", header: "Expenses (₹)", enableColumnFilter: false, cell: ({ getValue }) => formatInr(getValue() as number) },
    { accessorKey: "resourceCostInr", header: "Resource Cost (₹)", enableColumnFilter: false, cell: ({ getValue }) => formatInr(getValue() as number) },
    { accessorKey: "departmentCostsInr", header: "Department Costs (₹)", enableColumnFilter: false, cell: ({ getValue }) => formatInr(getValue() as number) },
    { accessorKey: "totalCostInr", header: "Total Cost (₹)", enableColumnFilter: false, cell: ({ getValue }) => <span className="font-semibold">{formatInr(getValue() as number)}</span> },
    {
      id: "actions",
      header: "Actions",
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { setEditing({ id: row.original.id, name: row.original.name, departmentId: row.original.departmentId }); setOpen(true); }}><Pencil size={12} /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Cost Centres"
      actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> Add Cost Centre</Button>}
      filterBar={<FilterBar />}
    >
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(r) => router.push(`/cost-centres/${r.id}`)}
        empty={{ icon: <Boxes size={32} />, heading: "No cost centres", cta: <Button onClick={() => setOpen(true)}><Plus size={14} /> Add Cost Centre</Button> }}
      />
      <CostCentreForm open={open} onOpenChange={setOpen} editing={editing} onSaved={() => mutate()} />
    </PageShell>
  );
}
