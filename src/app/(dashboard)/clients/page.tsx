"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Briefcase, Pencil, XCircle, ListChecks, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { StatusPills } from "@/components/common/StatusPills";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/common/CurrencyDisplay";
import { CodeBadges, StatusBadge } from "@/components/common";
import { ClientEditModal, ClientTerminateModal, type ClientEditData } from "@/components/clients/ClientModals";
import { ClientServicesModal } from "@/components/clients/ClientServicesModal";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";
import { useOpsStore } from "@/store/filterStore";
import { formatUsd, formatInr, formatDate } from "@/lib/utils";

type Row = {
  id: string; name: string; billingType: string; paymentMethod: string; txnFeeEnabled: boolean;
  packages: string[]; services: string[]; startDate: string; endDate: string | null;
  driverBand: string | null; vanBand: string | null; routeBand: string | null;
  monthlyFeeUsd: number; monthlyFeeInr: number; totalRevenueUsd: number; totalRevenueInr: number; status: string;
};

export default function ClientsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data, isLoading, mutate } = useSWR<{ data: Row[]; summary: Record<string, number> }>(`/api/clients?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [statusF, setStatusF] = React.useState("active");
  const [methodF, setMethodF] = React.useState("");
  const [pkgF, setPkgF] = React.useState("");
  const [editClient, setEditClient] = React.useState<ClientEditData | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [termId, setTermId] = React.useState<string | null>(null);
  const [termOpen, setTermOpen] = React.useState(false);
  const [svcId, setSvcId] = React.useState<string | null>(null);
  const [svcOpen, setSvcOpen] = React.useState(false);
  const [delTarget, setDelTarget] = React.useState<Row | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try { await apiSend(`/api/clients/${delTarget.id}`, "DELETE"); toast("Client deleted"); setDelTarget(null); mutate(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setDeleting(false); }
  };

  const all = data?.data ?? [];
  const statusCounts = {
    all: all.length,
    active: all.filter((r) => r.status === "ACTIVE").length,
    churned: all.filter((r) => r.status === "CHURNED").length,
    ending: all.filter((r) => r.status === "ENDING").length,
  };
  const STATUS_MAP: Record<string, string> = { active: "ACTIVE", churned: "CHURNED", ending: "ENDING" };
  const rows = all.filter((r) => {
    if (statusF !== "all" && r.status !== STATUS_MAP[statusF]) return false;
    if (methodF && r.paymentMethod !== methodF) return false;
    if (pkgF && !r.packages.includes(pkgF)) return false;
    return true;
  });

  const openEdit = (r: Row) => {
    setEditClient({ id: r.id, name: r.name, startDate: r.startDate, endDate: r.endDate, paymentMethod: r.paymentMethod, billingType: r.billingType, txnFeeEnabled: r.txnFeeEnabled, driverBand: r.driverBand, vanBand: r.vanBand, routeBand: r.routeBand });
    setEditOpen(true);
  };

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Client", cell: ({ getValue }) => <span className="font-semibold">{getValue() as string}</span> },
    { accessorKey: "billingType", header: "Billing", meta: { filterType: "select" }, cell: ({ getValue }) => <Badge tone={getValue() === "LEGACY" ? "neutral" : "purple"}>{getValue() === "LEGACY" ? "Legacy" : "New"}</Badge> },
    { accessorKey: "paymentMethod", header: "Method", cell: ({ row }) => { const m = row.original.paymentMethod === "CARD" ? "Card" : "ACH"; return <Badge tone="info">{row.original.txnFeeEnabled ? `${m} + Txn` : `${m} (no txn)`}</Badge>; } },
    { id: "pkg", header: "Package", enableColumnFilter: false, cell: ({ row }) => row.original.packages.map((p) => (p === "LESS_THAN_25" ? "<25" : ">25")).join(", ") },
    { id: "services", header: "Services", enableColumnFilter: false, cell: ({ row }) => <CodeBadges codes={row.original.services} /> },
    { accessorKey: "startDate", header: "Start", enableColumnFilter: false, cell: ({ getValue }) => formatDate(getValue() as string) },
    { accessorKey: "endDate", header: "End", enableColumnFilter: false, cell: ({ getValue }) => formatDate(getValue() as string | null) },
    { id: "fee", header: "Monthly Fee", enableColumnFilter: false, cell: ({ row }) => <Money usd={row.original.monthlyFeeUsd} inr={row.original.monthlyFeeInr} primary="USD" /> },
    { id: "rev", header: "Total Revenue", enableColumnFilter: false, cell: ({ row }) => <Money usd={row.original.totalRevenueUsd} inr={row.original.totalRevenueInr} primary="USD" /> },
    { accessorKey: "status", header: "Status", meta: { filterType: "select" }, cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: "actions",
      header: "Actions",
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" title="Edit Client" onClick={() => openEdit(row.original)}><Pencil size={12} /></Button>
          <Button size="sm" variant="ghost" title="Edit Services" onClick={() => { setSvcId(row.original.id); setSvcOpen(true); }}><ListChecks size={12} /></Button>
          {row.original.status !== "CHURNED" && (
            <Button size="sm" variant="ghost" title="Terminate" onClick={() => { setTermId(row.original.id); setTermOpen(true); }}><XCircle size={12} /></Button>
          )}
          {row.original.status === "CHURNED" && (
            <Button size="sm" variant="ghost" title="Delete" onClick={() => setDelTarget(row.original)}><Trash2 size={12} className="text-[#D85A30]" /></Button>
          )}
        </div>
      ),
    },
  ];

  const s = data?.summary;

  return (
    <PageShell
      title="Clients"
      actions={<Button onClick={() => router.push("/clients/new")}><Plus size={14} /> Add Client</Button>}
      filterBar={
        <FilterBar>
          <StatusPills
            value={statusF}
            onChange={setStatusF}
            options={[
              { value: "all", label: "All", count: statusCounts.all },
              { value: "active", label: "Active", count: statusCounts.active },
              { value: "ending", label: "Ending Soon", count: statusCounts.ending },
              { value: "churned", label: "Churned", count: statusCounts.churned },
            ]}
          />
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

      <DataTable columns={columns} data={rows} loading={isLoading} frozenColumnId="name" onRowClick={(r) => router.push(`/clients/${r.id}`)}
        empty={{ icon: <Briefcase size={32} />, heading: "No clients", cta: <Button onClick={() => router.push("/clients/new")}><Plus size={14} /> Add Client</Button> }} />

      <ClientEditModal open={editOpen} onOpenChange={setEditOpen} client={editClient} onSaved={() => mutate()} />
      <ClientTerminateModal open={termOpen} onOpenChange={setTermOpen} clientId={termId} onSaved={() => mutate()} />
      <ClientServicesModal open={svcOpen} onOpenChange={setSvcOpen} clientId={svcId} onSaved={() => mutate()} />

      <Dialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <DialogContent title="Delete Client" width={440}>
          <DialogBody><p className="text-[13px] text-[#475569]">This will permanently delete <span className="font-semibold">{delTarget?.name}</span> and all related records (services, billing records, assignments, expenses). This cannot be undone.</p></DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDelTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
