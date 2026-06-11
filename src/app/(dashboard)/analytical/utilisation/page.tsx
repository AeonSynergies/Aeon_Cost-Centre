"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChevronDown } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { FilterBar } from "@/components/common/FilterBar";
import { Card, SectionTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UtilBar } from "@/components/common/UtilBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiGet } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { formatInr } from "@/lib/utils";

type Row = { resourceId: string; resource: string; clients: number; serviceHrs: number; invoiceHrs: number; adocHrs: number; totalHrs: number; utilisationPct: number; monthlyHrs: number; revenueAllottedInr: number; costInr: number; grossMarginInr: number; marginPct: number; status: string };
type Tab = { id: string; name: string; scorecard: { resources: number; clients: number; revenueInr: number; costInr: number; marginInr: number; avgUtilPct: number }; rows: Row[] };
type Data = { scorecard: { billableResources: number; activeClients: number; revenueInr: number; costInr: number; grossMarginInr: number; avgUtilPct: number; overCap: number; underUtil: number }; tabs: Tab[] };

const statusLabel: Record<string, string> = { HEALTHY: "ACTIVE", OVER_CAPACITY: "TERMED", UNDER_UTILISED: "ENDING", SEVERELY_UNDER: "TERMED" };

export default function UtilisationAnalyticsPage() {
  const router = useRouter();
  const { periodYear, periodMonth } = useOpsStore();
  const { data } = useSWR<Data>(`/api/analytical/utilisation?year=${periodYear}&month=${periodMonth}`, apiGet);
  const sc = data?.scorecard;
  const [showTiers, setShowTiers] = React.useState(false);

  return (
    <PageShell title="Utilisation" filterBar={<FilterBar />}>
      <Card className="border-0 bg-[#0F1629] p-4 text-white">
        <SectionTitle className="text-[#7A8FAD]">DSP Scorecard</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          {[
            ["Billable Resources", sc?.billableResources ?? "—"],
            ["Active Clients", sc?.activeClients ?? "—"],
            ["Monthly Rev (INR)", sc ? formatInr(sc.revenueInr) : "—"],
            ["Monthly Cost (INR)", sc ? formatInr(sc.costInr) : "—"],
            ["Gross Margin (INR)", sc ? formatInr(sc.grossMarginInr) : "—"],
            ["Avg Util %", sc ? `${sc.avgUtilPct.toFixed(0)}%` : "—"],
            ["Over-cap", sc?.overCap ?? "—"],
            ["Under-util", sc?.underUtil ?? "—"],
          ].map(([l, v]) => (
            <div key={l as string}><div className="text-[9px] uppercase tracking-wide text-[#7A8FAD]">{l}</div><div className="text-[15px] font-bold">{v}</div></div>
          ))}
        </div>
      </Card>

      <Tabs defaultValue={data?.tabs[0]?.id ?? "t0"} className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          {data?.tabs.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.name}</TabsTrigger>)}
        </TabsList>
        {data?.tabs.map((t) => {
          const totalH = t.rows.reduce((s, r) => s + r.totalHrs, 0) || 1;
          const svc = t.rows.reduce((s, r) => s + r.serviceHrs, 0);
          const inv = t.rows.reduce((s, r) => s + r.invoiceHrs, 0);
          const adoc = t.rows.reduce((s, r) => s + r.adocHrs, 0);
          return (
            <TabsContent key={t.id} value={t.id}>
              <div className="mb-3 grid grid-cols-3 gap-3 md:grid-cols-6">
                {[
                  ["Resources", t.scorecard.resources], ["Clients", t.scorecard.clients],
                  ["Revenue", formatInr(t.scorecard.revenueInr)], ["Cost", formatInr(t.scorecard.costInr)],
                  ["Margin", formatInr(t.scorecard.marginInr)], ["Avg Util%", `${t.scorecard.avgUtilPct.toFixed(0)}%`],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-[8px] border border-[#E8ECF4] bg-white px-3 py-2"><div className="text-[9px] uppercase text-[#94A3B8]">{l}</div><div className="text-[13px] font-bold">{v}</div></div>
                ))}
              </div>

              <Card className="overflow-auto p-4">
                <table className="w-full whitespace-nowrap text-[11px]">
                  <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Clients</th><th>Service Hrs</th><th>Invoice Hrs</th><th>ADOC Hrs</th><th>Total Hrs</th><th>Util %</th><th>Monthly Hrs</th><th>Revenue Allotted</th><th>Cost</th><th>Gross Margin</th><th>Margin %</th><th>Status</th></tr></thead>
                  <tbody>
                    {t.rows.length === 0 && <tr><td colSpan={13} className="py-4 text-center text-[#94A3B8]">No utilisation data for this period.</td></tr>}
                    {t.rows.map((r) => (
                      <tr key={r.resourceId} className="cursor-pointer border-b border-[#E8ECF4] tabular-nums hover:bg-[#F8F9FC]" onClick={() => router.push(`/analytical/utilisation/${r.resourceId}`)}>
                        <td className="py-2 font-medium">{r.resource}</td><td>{r.clients}</td><td>{r.serviceHrs.toFixed(2)}</td><td>{r.invoiceHrs.toFixed(2)}</td><td>{r.adocHrs.toFixed(2)}</td><td>{r.totalHrs.toFixed(2)}</td>
                        <td><UtilBar pct={r.utilisationPct} /></td><td>{r.monthlyHrs.toFixed(1)}</td><td>{formatInr(r.revenueAllottedInr)}</td><td>{formatInr(r.costInr)}</td>
                        <td className={r.grossMarginInr < 0 ? "text-[#D85A30]" : "text-[#1D9E75]"}>{formatInr(r.grossMarginInr)}</td><td>{r.marginPct.toFixed(0)}%</td>
                        <td><StatusBadge status={statusLabel[r.status] ?? "ACTIVE"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card className="mt-3 p-4">
                <SectionTitle>Workflow Split</SectionTitle>
                <div className="mt-2 flex h-4 overflow-hidden rounded-full">
                  <div style={{ width: `${(svc / totalH) * 100}%`, background: "#3266AD" }} title="Service" />
                  <div style={{ width: `${(inv / totalH) * 100}%`, background: "#1D9E75" }} title="Invoice" />
                  <div style={{ width: `${(adoc / totalH) * 100}%`, background: "#BA7517" }} title="ADOC" />
                </div>
                <div className="mt-2 flex gap-4 text-[11px] text-[#64748B]">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#3266AD" }} />Service {((svc / totalH) * 100).toFixed(0)}%</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#1D9E75" }} />Invoice {((inv / totalH) * 100).toFixed(0)}%</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#BA7517" }} />ADOC {((adoc / totalH) * 100).toFixed(0)}%</span>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <Card className="p-4">
        <button className="flex w-full items-center justify-between" onClick={() => setShowTiers((s) => !s)}>
          <SectionTitle>Bookkeeping Tier Reference</SectionTitle>
          <ChevronDown size={14} className={showTiers ? "rotate-180 transition" : "transition"} />
        </button>
        {showTiers && (
          <table className="mt-2 w-full text-[12px]">
            <tbody>
              {[["Tier 1", "txn ≤ 10", "0.10 hrs/day"], ["Tier 2", "txn ≤ 15", "0.15 hrs/day"], ["Tier 3", "txn ≤ 30", "0.25 hrs/day"], ["Tier 4", "txn ≤ 50", "0.45 hrs/day"]].map((r) => (
                <tr key={r[0]} className="border-b border-[#E8ECF4]"><td className="py-1.5 font-medium">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
