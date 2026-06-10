"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Download, UserCog } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Money } from "@/components/common/CurrencyDisplay";
import {
  Avatar,
  StatusBadge,
  WorkingDayChips,
  useReference,
} from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr } from "@/lib/utils";

type Row = {
  id: string;
  employeeNumber: string;
  name: string;
  title: string;
  departmentName: string;
  costCentreName: string;
  isBillable: boolean;
  workingDays: number[];
  status: string;
  totalCostInr: number;
  totalCostUsd: number;
};

export default function ResourcesPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data: ref } = useReference();
  const { data, isLoading, mutate } = useSWR<{ data: Row[]; summary: Record<string, number> }>(
    `/api/resources?year=${periodYear}&month=${periodMonth}`,
    apiGet
  );

  const [addOpen, setAddOpen] = React.useState(false);
  const [statusF, setStatusF] = React.useState("");
  const [deptF, setDeptF] = React.useState("");
  const [billableOnly, setBillableOnly] = React.useState(false);

  const rows = (data?.data ?? []).filter((r) => {
    if (statusF && r.status !== statusF) return false;
    if (deptF && r.departmentName !== deptF) return false;
    if (billableOnly && !r.isBillable) return false;
    return true;
  });

  const columns: ColumnDef<Row, unknown>[] = [
    {
      accessorKey: "employeeNumber",
      header: "ID",
      cell: ({ row }) => <span className="font-mono text-[11px] text-[#94A3B8]">{row.original.employeeNumber}</span>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.original.name} />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: "departmentName", header: "Department", cell: ({ getValue }) => <Badge tone="info">{getValue() as string}</Badge> },
    { accessorKey: "costCentreName", header: "Cost Centre", cell: ({ getValue }) => <span className="text-[#64748B]">{getValue() as string}</span> },
    { accessorKey: "title", header: "Title" },
    {
      id: "cost",
      header: "Total Cost",
      enableColumnFilter: false,
      cell: ({ row }) => <Money inr={row.original.totalCostInr} usd={row.original.totalCostUsd} primary="INR" />,
    },
    {
      accessorKey: "isBillable",
      header: "Billable",
      cell: ({ getValue }) => (getValue() ? <span className="text-[#1D9E75]">✓ Yes</span> : <span className="text-[#94A3B8]">—</span>),
    },
    { id: "wd", header: "Working Days", enableColumnFilter: false, cell: ({ row }) => <WorkingDayChips days={row.original.workingDays} /> },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ];

  const s = data?.summary;

  return (
    <PageShell
      title="Resources"
      actions={
        <>
          <Button variant="secondary"><Download size={14} /> Export</Button>
          <Button onClick={() => setAddOpen(true)}><Plus size={14} /> Add Resource</Button>
        </>
      }
      filterBar={
        <FilterBar>
          <FilterSelect
            value={statusF}
            onChange={setStatusF}
            placeholder="All Status"
            options={[{ value: "ACTIVE", label: "Active" }, { value: "TERMED", label: "Termed" }]}
          />
          <FilterSelect
            value={deptF}
            onChange={setDeptF}
            placeholder="All Departments"
            options={(ref?.departments ?? []).map((d) => ({ value: d.name, label: d.name }))}
          />
          <label className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
            <Switch checked={billableOnly} onCheckedChange={setBillableOnly} /> Billable only
          </label>
        </FilterBar>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total" value={s?.total ?? "—"} />
        <Stat label="Active" value={s?.active ?? "—"} />
        <Stat label="Billable" value={s?.billable ?? "—"} />
        <Stat label="Total Cost (INR)" value={s ? formatInr(s.totalCostInr) : "—"} />
        <Stat label="Fully-Loaded (INR)" value={s ? formatInr(s.fullyLoadedInr) : "—"} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        onRowClick={(r) => router.push(`/resources/${r.id}`)}
        empty={{ icon: <UserCog size={32} />, heading: "No resources", subtext: "Add your first resource to get started.", cta: <Button onClick={() => setAddOpen(true)}><Plus size={14} /> Add Resource</Button> }}
      />

      <ResourceForm open={addOpen} onOpenChange={setAddOpen} onSaved={() => mutate()} />
    </PageShell>
  );
}
