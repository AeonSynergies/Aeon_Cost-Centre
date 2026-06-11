"use client";

import * as React from "react";
import useSWR from "swr";
import { ScrollText } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api-client";

type Log = { id: string; createdAt: string; userName: string; action: string; entity: string; entityId: string; before: unknown; after: unknown };
type Data = { data: Log[]; entities: string[]; users: { id: string; name: string }[] };

export default function AuditPage() {
  const [entity, setEntity] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const qs = new URLSearchParams({ entity, userId, from, to }).toString();
  const { data, isLoading } = useSWR<Data>(`/api/admin/audit?${qs}`, apiGet);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <PageShell
      title="Audit Log"
      filterBar={
        <FilterBar>
          <FilterSelect value={entity} onChange={setEntity} placeholder="All Entities" options={(data?.entities ?? []).map((e) => ({ value: e, label: e }))} />
          <FilterSelect value={userId} onChange={setUserId} placeholder="All Users" options={(data?.users ?? []).map((u) => ({ value: u.id, label: u.name }))} />
          <Input className="h-[30px] w-36" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input className="h-[30px] w-36" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FilterBar>
      }
    >
      <Card className="min-h-0 flex-1 overflow-auto p-4">
        {!isLoading && data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-[#94A3B8]"><ScrollText size={32} /><div className="text-[14px] font-semibold text-[#0F1629]">No audit entries</div></div>
        )}
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Record</th><th></th></tr></thead>
          <tbody>
            {data?.data.map((l) => (
              <React.Fragment key={l.id}>
                <tr className="border-b border-[#E8ECF4]">
                  <td className="py-2 tabular-nums">{new Date(l.createdAt).toLocaleString("en-GB")}</td>
                  <td className="font-medium">{l.userName}</td>
                  <td><Badge tone="info">{l.action}</Badge></td>
                  <td>{l.entity}</td>
                  <td className="font-mono text-[10px] text-[#94A3B8]">{l.entityId.slice(0, 12)}</td>
                  <td className="text-right">{Boolean(l.before || l.after) && <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>Details</Button>}</td>
                </tr>
                {expanded === l.id && (
                  <tr><td colSpan={6} className="bg-[#F8F9FC] p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><div className="mb-1 text-[10px] uppercase text-[#94A3B8]">Before</div><pre className="overflow-auto rounded bg-white p-2 text-[10px]">{l.before ? JSON.stringify(l.before, null, 2) : "—"}</pre></div>
                      <div><div className="mb-1 text-[10px] uppercase text-[#94A3B8]">After</div><pre className="overflow-auto rounded bg-white p-2 text-[10px]">{l.after ? JSON.stringify(l.after, null, 2) : "—"}</pre></div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </PageShell>
  );
}
