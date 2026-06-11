"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Layers, Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useReference } from "@/components/common";
import { ServiceForm, type ServiceEditing } from "@/components/services/ServiceForm";
import { PackageModal, type PackageEditing } from "@/components/services/PackageModal";
import { apiGet } from "@/lib/api-client";
import { formatUsd, formatInr, formatDate } from "@/lib/utils";

const RATE_B = 86;

type ServiceRow = {
  id: string; code: string; name: string; departmentId: string; costCentreId: string;
  departmentName: string; costCentreName: string; activeClients: number; activityCount: number;
  packages: PackageEditing[];
};

export default function ServicesPage() {
  const router = useRouter();
  const { data: ref } = useReference();
  const { data, isLoading, mutate } = useSWR<{ data: ServiceRow[] }>("/api/services", apiGet);
  const [tab, setTab] = React.useState("services");
  const [deptF, setDeptF] = React.useState("");
  const [svcOpen, setSvcOpen] = React.useState(false);
  const [editingSvc, setEditingSvc] = React.useState<ServiceEditing | null>(null);
  const [pkgOpen, setPkgOpen] = React.useState(false);
  const [editingPkg, setEditingPkg] = React.useState<PackageEditing | null>(null);

  const services = (data?.data ?? []).filter((s) => !deptF || s.departmentId === deptF);
  const packages = services.flatMap((s) => s.packages.map((p) => ({ ...p, serviceCode: s.code })));

  const serviceCols: ColumnDef<ServiceRow, unknown>[] = [
    { accessorKey: "code", header: "Code", cell: ({ getValue }) => <Badge tone="info"><span className="font-mono">{getValue() as string}</span></Badge> },
    { accessorKey: "name", header: "Service Name", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: "departmentName", header: "Department" },
    { accessorKey: "costCentreName", header: "Cost Centre", cell: ({ getValue }) => <span className="text-[#64748B]">{getValue() as string}</span> },
    { accessorKey: "activeClients", header: "Active Clients", enableColumnFilter: false },
    { accessorKey: "activityCount", header: "Activities", enableColumnFilter: false },
    {
      id: "actions", header: "Actions", enableColumnFilter: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { const s = row.original; setEditingSvc({ id: s.id, code: s.code, name: s.name, departmentId: s.departmentId, costCentreId: s.costCentreId, description: null }); setSvcOpen(true); }}><Pencil size={12} /></Button>
        </div>
      ),
    },
  ];

  type PkgRow = PackageEditing & { serviceCode: string };
  const pkgCols: ColumnDef<PkgRow, unknown>[] = [
    { accessorKey: "packageType", header: "Package Type", cell: ({ getValue }) => (getValue() === "LESS_THAN_25" ? "< 25 Routes" : "> 25 Routes") },
    { accessorKey: "serviceCode", header: "Service", cell: ({ getValue }) => <span className="font-mono text-[11px]">{getValue() as string}</span> },
    { accessorKey: "monthlyFeeUsd", header: "Price ($)", enableColumnFilter: false, cell: ({ getValue }) => formatUsd(getValue() as number) },
    { id: "inr", header: "Price (₹ @ B)", enableColumnFilter: false, cell: ({ row }) => formatInr(row.original.monthlyFeeUsd * RATE_B) },
    { accessorKey: "effectiveFrom", header: "Effective From", enableColumnFilter: false, cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: "actions", header: "Actions", enableColumnFilter: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { setEditingPkg(row.original); setPkgOpen(true); }}><Pencil size={12} /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Services"
      actions={
        tab === "services"
          ? <Button onClick={() => { setEditingSvc(null); setSvcOpen(true); }}><Plus size={14} /> Add Service</Button>
          : <Button onClick={() => { setEditingPkg(null); setPkgOpen(true); }}><Plus size={14} /> Add Package</Button>
      }
      filterBar={<FilterBar><FilterSelect value={deptF} onChange={setDeptF} placeholder="All Departments" options={(ref?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} /></FilterBar>}
    >
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        <TabsContent value="services" className="flex min-h-0 flex-1 flex-col">
          <DataTable columns={serviceCols} data={services} loading={isLoading} onRowClick={(r) => router.push(`/services/${r.id}`)}
            empty={{ icon: <Layers size={32} />, heading: "No services", cta: <Button onClick={() => { setEditingSvc(null); setSvcOpen(true); }}><Plus size={14} /> Add Service</Button> }} />
        </TabsContent>
        <TabsContent value="packages" className="flex min-h-0 flex-1 flex-col">
          <DataTable columns={pkgCols} data={packages} loading={isLoading} onRowClick={(p) => { setEditingPkg(p); setPkgOpen(true); }}
            empty={{ icon: <Layers size={32} />, heading: "No packages" }} />
        </TabsContent>
      </Tabs>

      <ServiceForm open={svcOpen} onOpenChange={setSvcOpen} editing={editingSvc} onSaved={() => mutate()} />
      <PackageModal open={pkgOpen} onOpenChange={setPkgOpen} editing={editingPkg} onSaved={() => mutate()} />
    </PageShell>
  );
}
