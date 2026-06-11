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
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useReference } from "@/hooks/useReference";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { toast } from "@/store/toastStore";
import { formatUsd, formatInr } from "@/lib/utils";

type Row = {
  id: string; clientId: string; clientName: string; billingType: string;
  periodYear: number; periodMonth: number;
  proratedFeeUsd: number; discountUsd: number; stripeFeeUsd: number;
  grossRevenueUsd: number; netRevenueUsd: number; netRevenueInr: number; status: string;
};

export default function BillingPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, isLoading, mutate } = useSWR<{ data: Row[]; summary: Record<string, number> }>(`/api/billing?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [statusF, setStatusF] = React.useState("");
  const [typeF, setTypeF] = React.useState("");
  const [genOpen, setGenOpen] = React.useState(false);
  const { isAdmin } = useCurrentUser();

  const rows = (data?.data ?? []).filter((r) => {
    if (statusF && r.status !== statusF) return false;
    if (typeF && r.billingType !== typeF) return false;
    return true;
  });

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "clientName", header: "Client", cell: ({ getValue }) => <span className="font-semibold">{getValue() as string}</span> },
    { accessorKey: "billingType", header: "Billing Type", cell: ({ getValue }) => <Badge tone={getValue() === "LEGACY" ? "neutral" : "purple"}>{getValue() === "LEGACY" ? "Legacy" : "New"}</Badge> },
    { id: "period", header: "Period", enableColumnFilter: false, cell: ({ row }) => `${row.original.periodMonth}/${row.original.periodYear}` },
    { accessorKey: "proratedFeeUsd", header: "Prorated Fee ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "discountUsd", header: "Discount ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "stripeFeeUsd", header: "Stripe ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "grossRevenueUsd", header: "Gross ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "netRevenueUsd", header: "Net ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { accessorKey: "netRevenueInr", header: "Net (₹)", enableColumnFilter: false, cell: ({ getValue }) => formatInr(getValue() as number) },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ];

  const s = data?.summary;

  return (
    <PageShell
      title="Billing"
      actions={isAdmin ? <Button onClick={() => setGenOpen(true)}><Zap size={14} /> Generate Billing</Button> : undefined}
      filterBar={
        <FilterBar>
          <FilterSelect value={statusF} onChange={setStatusF} placeholder="All Status" options={[{ value: "DRAFT", label: "Draft" }, { value: "FINALISED", label: "Finalised" }]} />
          <FilterSelect value={typeF} onChange={setTypeF} placeholder="All Types" options={[{ value: "LEGACY", label: "Legacy" }, { value: "NEW", label: "New" }]} />
        </FilterBar>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total Records" value={s?.total ?? "—"} />
        <Stat label="Draft" value={s?.draft ?? "—"} />
        <Stat label="Finalised" value={s?.finalised ?? "—"} />
        <Stat label="Gross Revenue ($)" value={s ? formatUsd(s.grossRevenueUsd) : "—"} />
        <Stat label="Net Revenue (INR)" value={s ? formatInr(s.netRevenueInr) : "—"} />
      </div>

      <DataTable columns={columns} data={rows} loading={isLoading} onRowClick={(r) => router.push(`/billing/${r.id}`)}
        empty={{ icon: <Receipt size={32} />, heading: "No billing records", subtext: "Generate billing for this period.", cta: <Button onClick={() => setGenOpen(true)}><Zap size={14} /> Generate Billing</Button> }} />

      <GenerateModal open={genOpen} onOpenChange={setGenOpen} year={periodYear} month={periodMonth} existingCount={s?.total ?? 0} onDone={() => mutate()} />
    </PageShell>
  );
}

function GenerateModal({ open, onOpenChange, year, month, existingCount, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; year: number; month: number; existingCount: number; onDone: () => void }) {
  const { data: ref } = useReference();
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open && ref) {
      const active = ref.clients.filter((c) => !c.endDate || new Date(c.endDate) >= new Date());
      setSelected(Object.fromEntries(active.map((c) => [c.id, true])));
    }
  }, [open, ref]);

  const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await apiSend<{ created: number; skipped: number }>("/api/billing/generate", "POST", { periodYear: year, periodMonth: month, clientIds: ids });
      toast(`Generated ${res.created} record(s)${res.skipped ? `, skipped ${res.skipped}` : ""}`);
      onDone(); onOpenChange(false);
    } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Generate Billing — ${month}/${year}`}>
        <DialogBody>
          {existingCount > 0 && <div className="mb-3 rounded-[5px] bg-[#FAEEDA] px-3 py-2 text-[12px] text-[#633806]">{existingCount} record(s) already exist for this period and will be skipped.</div>}
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {ref?.clients.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-[12px]">
                <Checkbox checked={!!selected[c.id]} onChange={() => setSelected((s) => ({ ...s, [c.id]: !s[c.id] }))} />
                {c.name}
              </label>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[#64748B]">Will generate up to {ids.length} billing record(s).</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={generate} disabled={busy || ids.length === 0}>{busy ? "Generating…" : "Generate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
