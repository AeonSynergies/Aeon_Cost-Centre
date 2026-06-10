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
import { CategoryBadge, CodeBadges } from "@/components/common/StatusBadge";
import { DepartmentForm } from "@/components/departments/DepartmentForm";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";

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
      <DepartmentForm open={open} onOpenChange={setOpen} onSaved={() => mutate()} />
    </PageShell>
  );
}
