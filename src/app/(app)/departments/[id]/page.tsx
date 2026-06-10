"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge, CodeBadges, StatusBadge } from "@/components/ui/bits";
import { apiGet } from "@/lib/api-client";

type Detail = {
  id: string;
  name: string;
  category: string;
  head: { id: string; name: string } | null;
  services: { id: string; code: string; name: string }[];
  costCentres: { id: string; name: string }[];
  resources: { id: string; name: string; title: string; isBillable: boolean; terminatedDate: string | null }[];
};

export default function DepartmentDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data } = useSWR<{ data: Detail }>(`/api/departments/${params.id}`, apiGet);
  const d = data?.data;

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/departments")}><ArrowLeft size={14} /> Departments</Button>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-[22px] font-bold text-[#0F1629]">{d?.name ?? "…"}</h1>
        {d && <CategoryBadge category={d.category} />}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="p-4">
          <SectionTitle>Head</SectionTitle>
          <p className="mt-1.5 text-[14px] font-medium">{d?.head?.name ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <SectionTitle>Services</SectionTitle>
          <div className="mt-1.5"><CodeBadges codes={d?.services.map((s) => s.code) ?? []} /></div>
        </Card>
        <Card className="p-4">
          <SectionTitle>Cost Centres</SectionTitle>
          <p className="mt-1.5 text-[13px] text-[#64748B]">{d?.costCentres.map((c) => c.name).join(", ") || "—"}</p>
        </Card>
      </div>

      <Card className="mt-3 p-4">
        <SectionTitle>Resources ({d?.resources.length ?? 0})</SectionTitle>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase tracking-wide text-[#64748B]">
              <th className="py-2">Name</th><th>Title</th><th>Billable</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {d?.resources.map((r) => (
              <tr key={r.id} className="cursor-pointer border-b border-[#E8ECF4] hover:bg-[#F8F9FC]" onClick={() => router.push(`/resources/${r.id}`)}>
                <td className="py-2 font-medium">{r.name}</td>
                <td>{r.title}</td>
                <td>{r.isBillable ? "✓" : "—"}</td>
                <td><StatusBadge status={r.terminatedDate ? "TERMED" : "ACTIVE"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
