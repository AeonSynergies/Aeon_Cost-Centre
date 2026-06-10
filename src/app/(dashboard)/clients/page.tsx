"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Briefcase } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/common/CurrencyDisplay";
import { CodeBadges, StatusBadge } from "@/components/common";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatUsd, formatInr, formatDate } from "@/lib/utils";

type Row = {
  id: string; name: string; billingType: string; paymentMethod: string;
  packages: string[]; services: string[]; startDate: string; endDate: string | null;
  monthlyFeeUsd: number; monthlyFeeInr: number; totalRevenueUsd: number; totalRevenueInr: number; status: string;
};

export default function ClientsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, isLoading } = useSWR<{ data: Row[]; summary: Record<string, number> }>(`/api/clients?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [statusF, setStatusF] = React.useState("");
  const [methodF, setMethodF] = React.useState("");
  const [pkgF, setPkgF] = React.useState("");

  const rows = (data?.data ?? []).filter((r) => {
    if (statusF && r.status !== statusF) return false;
    if (methodF && r.paymentMethod !== methodF) return false;
    if (pkgF && !r.packages.includes(pkgF)) return false;
    return true;
  });

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Client", cell: ({ getValue }) => <span className="font-semibold">{getValue() as string}</span> },
    { accessorKey: "billingType", header: "Billing", cell: ({ getValue }) => <Badge tone={getValue() === "LEGACY" ? "neutral" : "purple"}>{getValue() === "LEGACY" ? "Legacy" : "New"}</Badge> },
    { accessorKey: "paymentMethod", header: "Method", cell: ({ getValue }) => <Badge tone="info">{getValue() as string}</Badge> },
    { id: "pkg", header: "Package", enableColumnFilter: false, cell: ({ row }) => row.original.packages.map((p) => (p === "LESS_THAN_25" ? "<25" : ">25")).join(", ") },
    { id: "services", header: "Services", enableColumnFilter: false, cell: ({ row }) => <CodeBadges codes={row.original.services} /> },
    { accessorKey: "startDate", header: "Start", enableColumnFilter: false, cell: ({ getValue }) => formatDate(getValue() as string) },
    { accessorKey: "endDate", header: "End", enableColumnFilter: false, cell: ({ getValue }) => formatDate(getValue() as string | null) },
    { id: "fee", header: "Monthly Fee", enableColumnFilter: false, cell: ({ row }) => <Money usd={row.original.monthlyFeeUsd} inr={row.original.monthlyFeeInr} primary="USD" /> },
    { id: "rev", header: "Total Revenue", enableColumnFilter: false, cell: ({ row }) => <Money usd={row.original.totalRevenueUsd} inr={row.original.totalRevenueInr} primary="USD" /> },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ];

  const s = data?.summary;

  return (
    <PageShell
      title="Clients"
      actions={<Button onClick={() => router.push("/clients/new")}><Plus size={14} /> Add Client</Button>}
      filterBar={
        <FilterBar>
          <FilterSelect value={statusF} onChange={setStatusF} placeholder="All Status" options={[{ value: "ACTIVE", label: "Active" }, { value: "ENDING", label: "Ending" }, { value: "CHURNED", label: "Churned" }]} />
          <FilterSelect value={methodF} onChange={setMethodF} placeholder="All Methods" options={[{ value: "CARD", label: "Card" }, { value: "ACH", label: "ACH" }]} />
          <FilterSelect value={pkgF} onChange={setPkgF} placeholder="All Packages" options={[{ value: "LESS_THAN_25", label: "< 25 Routes" }, { value: "MORE_THAN_25", label: "> 25 Routes" }]} />
        </FilterBar>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Active" value={s?.active ?? "—"} />
        <Stat label="Churned" value={s?.churned ?? "—"} />
        <Stat label="Total MRR ($)" value={s ? formatUsd(s.mrrUsd) : "—"} />
        <Stat label="Month Revenue (INR)" value={s ? formatInr(s.monthRevenueInr) : "—"} />
        <Stat label="Avg per Client ($)" value={s ? formatUsd(s.avgPerClientUsd) : "—"} />
      </div>

      <DataTable columns={columns} data={rows} loading={isLoading} onRowClick={(r) => router.push(`/clients/${r.id}`)}
        empty={{ icon: <Briefcase size={32} />, heading: "No clients", cta: <Button onClick={() => router.push("/clients/new")}><Plus size={14} /> Add Client</Button> }} />
    </PageShell>
  );
}
