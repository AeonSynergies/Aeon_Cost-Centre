"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Boxes } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { CostCentreForm, type CostCentreEditing } from "@/components/cost-centres/CostCentreForm";
import { useReference } from "@/hooks/useReference";
import { apiGet } from "@/lib/api-client";
import { formatInr, formatUsd } from "@/lib/utils";

type Row = CostCentreEditing & { departmentName: string | null; resourceCount: number };

export default function CostCentresPage() {
  const { data: ref } = useReference();
  const { data, isLoading, mutate } = useSWR<{ data: Row[] }>("/api/cost-centres", apiGet);
  const [deptF, setDeptF] = React.useState("");
  const [editing, setEditing] = React.useState<CostCentreEditing | null>(null);
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
      <CostCentreForm open={open} onOpenChange={setOpen} editing={editing} onSaved={() => mutate()} />
    </PageShell>
  );
}
