"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common";
import { PackageModal, type PackageEditing } from "@/components/services/PackageModal";
import { ActivityModal, type ActivityEditing } from "@/components/services/ActivityModal";
import { ServiceForm } from "@/components/services/ServiceForm";
import { apiGet, apiSend } from "@/lib/api-client";
import { formatUsd, formatInr, formatDate } from "@/lib/utils";

const RATE_B = 86;

type Detail = {
  id: string; code: string; name: string; description: string | null;
  department: { id: string; name: string } | null;
  costCentre: { id: string; name: string } | null;
  packages: PackageEditing[];
  activities: ActivityEditing[];
  clientServices: { id: string; packageType: string; monthlyFeeUsd: number; client: { id: string; name: string; endDate: string | null } }[];
};

export default function ServiceDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ data: Detail }>(`/api/services/${params.id}`, apiGet);
  const d = data?.data;
  const [pkgOpen, setPkgOpen] = React.useState(false);
  const [editPkg, setEditPkg] = React.useState<PackageEditing | null>(null);
  const [actOpen, setActOpen] = React.useState(false);
  const [editAct, setEditAct] = React.useState<ActivityEditing | null>(null);
  const [svcEditOpen, setSvcEditOpen] = React.useState(false);

  const delPkg = async (id: string) => { await apiSend(`/api/services/${params.id}/packages/${id}`, "DELETE"); mutate(); };
  const delAct = async (id: string) => { await apiSend(`/api/services/${params.id}/activities/${id}`, "DELETE"); mutate(); };

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/services")}><ArrowLeft size={14} /> Services</Button>
      <div className="mt-2 flex items-center gap-3">
        <Badge tone="info"><span className="font-mono">{d?.code}</span></Badge>
        <h1 className="text-[22px] font-bold text-[#0F1629]">{d?.name ?? "…"}</h1>
        <span className="text-[12px] text-[#64748B]">{d?.department?.name} · {d?.costCentre?.name}</span>
        <div className="ml-auto"><Button variant="secondary" onClick={() => setSvcEditOpen(true)}>Edit Service</Button></div>
      </div>
      {d && d.department && d.costCentre && (
        <ServiceForm open={svcEditOpen} onOpenChange={setSvcEditOpen} editing={{ id: d.id, code: d.code, name: d.name, departmentId: d.department.id, costCentreId: d.costCentre.id, description: d.description }} onSaved={() => mutate()} />
      )}

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-4">
            <SectionTitle>Description</SectionTitle>
            <p className="mt-1.5 text-[13px] text-[#0F1629]">{d?.description || "No description."}</p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-[13px]">
              <div><div className="text-[11px] text-[#94A3B8]">Department</div>{d?.department?.name}</div>
              <div><div className="text-[11px] text-[#94A3B8]">Cost Centre</div>{d?.costCentre?.name}</div>
              <div><div className="text-[11px] text-[#94A3B8]">Active Clients</div>{d?.clientServices.length ?? 0}</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="packages">
          <div className="mb-2 flex justify-end"><Button onClick={() => { setEditPkg(null); setPkgOpen(true); }}><Plus size={14} /> Add Package</Button></div>
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Type</th><th>Fee ($)</th><th>Fee (₹)</th><th>Effective From</th><th></th></tr></thead>
              <tbody>
                {d?.packages.map((p) => (
                  <tr key={p.id} className="border-b border-[#E8ECF4]">
                    <td className="py-2">{p.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td>
                    <td>{formatUsd(p.monthlyFeeUsd)}</td>
                    <td>{formatInr(p.monthlyFeeUsd * RATE_B)}</td>
                    <td>{formatDate(p.effectiveFrom)}</td>
                    <td className="flex gap-1 py-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditPkg(p); setPkgOpen(true); }}><Pencil size={12} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => delPkg(p.id)}><Trash2 size={12} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <div className="mb-2 flex justify-end"><Button onClick={() => { setEditAct(null); setActOpen(true); }}><Plus size={14} /> Add Activity</Button></div>
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Activity</th><th>Default Hrs/Day</th><th></th></tr></thead>
              <tbody>
                {d?.activities.map((a) => (
                  <tr key={a.id} className="border-b border-[#E8ECF4]">
                    <td className="py-2 font-medium">{a.name}</td>
                    <td>{a.defaultExpectedHoursPerDay}</td>
                    <td className="flex gap-1 py-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditAct(a); setActOpen(true); }}><Pencil size={12} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => delAct(a.id)}><Trash2 size={12} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Client</th><th>Package</th><th>Monthly Fee</th><th>Status</th></tr></thead>
              <tbody>
                {d?.clientServices.map((cs) => (
                  <tr key={cs.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/clients/${cs.client.id}`)}>
                    <td className="py-2 font-medium">{cs.client.name}</td>
                    <td>{cs.packageType === "LESS_THAN_25" ? "< 25" : "> 25"}</td>
                    <td>{formatUsd(cs.monthlyFeeUsd)}</td>
                    <td><StatusBadge status={cs.client.endDate && new Date(cs.client.endDate) < new Date() ? "CHURNED" : "ACTIVE"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      <PackageModal open={pkgOpen} onOpenChange={setPkgOpen} editing={editPkg} fixedServiceId={params.id} onSaved={() => mutate()} />
      <ActivityModal open={actOpen} onOpenChange={setActOpen} editing={editAct} serviceId={params.id} onSaved={() => mutate()} />
    </div>
  );
}
