"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Zap, Receipt } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useReference } from "@/hooks/useReference";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { toast } from "@/store/toastStore";
import { formatUsd, formatInr, formatPeriod } from "@/lib/utils";

type Row = {
  id: string; clientId: string; clientName: string; billingType: string;
  periodYear: number; periodMonth: number;
  totalServiceCostUsd: number; proratedFeeUsd: number; discountUsd: number; stripeFeeUsd: number;
  grossRevenueUsd: number; netRevenueUsd: number; netRevenueInr: number; status: string;
};

export default function BillingPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, isLoading, mutate } = useSWR<{ data: Row[]; summary: Record<string, number> }>(`/api/billing?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [statusF, setStatusF] = React.useState("");
  const [typeF, setTypeF] = React.useState("");
  const [clientF, setClientF] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const { data: ref } = useReference();

  const generatePeriod = async () => {
    setGenerating(true);
    try {
      const res = await apiSend<{ created: number; skipped: number }>("/api/billing/generate", "POST", { periodYear, periodMonth, clientIds: [] });
      toast(`Generated ${res.created} record(s)${res.skipped ? `, skipped ${res.skipped}` : ""}`);
      mutate();
    } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setGenerating(false); }
  };
  const { isAdmin } = useCurrentUser();

  const rows = (data?.data ?? []).filter((r) => {
    if (statusF && r.status !== statusF) return false;
    if (typeF && r.billingType !== typeF) return false;
    if (clientF && r.clientId !== clientF) return false;
    return true;
  });

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "clientName", header: "Client", cell: ({ getValue }) => <span className="font-semibold">{getValue() as string}</span> },
    { accessorKey: "billingType", header: "Billing Type", cell: ({ getValue }) => <Badge tone={getValue() === "LEGACY" ? "neutral" : "purple"}>{getValue() === "LEGACY" ? "Legacy" : "New"}</Badge> },
    { id: "period", header: "Period", enableColumnFilter: false, cell: ({ row }) => `${row.original.periodMonth}/${row.original.periodYear}` },
    { accessorKey: "proratedFeeUsd", header: "Total Service Cost ($)", enableColumnFilter: false, cell: ({ row }) => {
      const prorated = Math.abs(row.original.proratedFeeUsd - row.original.totalServiceCostUsd) > 0.01;
      return <div><div>{formatUsd(row.original.proratedFeeUsd)}</div>{prorated && <div className="text-[9px] uppercase tracking-wide text-[#94A3B8]">Prorated</div>}</div>;
    } },
    { accessorKey: "discountUsd", header: "Discount ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "stripeFeeUsd", header: "Stripe ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "grossRevenueUsd", header: "Gross ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "netRevenueUsd", header: "Net ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "netRevenueInr", header: "Net (₹)", enableColumnFilter: false, cell: ({ getValue }) => formatInr(getValue() as number) },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ];

  const s = data?.summary;

  const noRecords = (s?.total ?? 0) === 0;

  return (
    <PageShell
      title="Billing"
      filterBar={
        <FilterBar>
          <FilterSelect value={clientF} onChange={setClientF} placeholder="All Clients" options={(ref?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={typeF} onChange={setTypeF} placeholder="All Types" options={[{ value: "LEGACY", label: "Legacy" }, { value: "NEW", label: "New" }]} />
          <FilterSelect value={statusF} onChange={setStatusF} placeholder="All Status" options={[{ value: "DRAFT", label: "Draft" }, { value: "FINALISED", label: "Finalised" }]} />
        </FilterBar>
      }
    >
      {isAdmin && noRecords ? (
        <div className="flex items-center justify-between rounded-[8px] border border-[#F3D7C6] bg-[#FAEEDA] px-4 py-3">
          <span className="text-[12px] text-[#633806]">No billing records for {formatPeriod(periodYear, periodMonth)}. Billing auto-generates on the 2nd of each month for the previous month.</span>
          <Button onClick={generatePeriod} disabled={generating}><Zap size={14} /> {generating ? "Generating…" : `Generate for ${formatPeriod(periodYear, periodMonth)}`}</Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total Records" value={s?.total ?? "—"} />
        <Stat label="Draft" value={s?.draft ?? "—"} />
        <Stat label="Finalised" value={s?.finalised ?? "—"} />
        <Stat label="Gross Revenue ($)" value={s ? formatUsd(s.grossRevenueUsd) : "—"} />
        <Stat label="Net Revenue (INR)" value={s ? formatInr(s.netRevenueInr) : "—"} />
      </div>

      <DataTable columns={columns} data={rows} loading={isLoading} onRowClick={(r) => router.push(`/billing/${r.id}`)}
        empty={{ icon: <Receipt size={32} />, heading: "No billing records", subtext: "Billing auto-generates on the 2nd of each month for the previous month." }} />
    </PageShell>
  );
}
