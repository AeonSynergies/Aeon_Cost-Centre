"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MonthSelect, YearSelect } from "@/components/common/MonthSelect";
import { useReference } from "@/hooks/useReference";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { toast } from "@/store/toastStore";
import { formatInr, formatUsd, formatPeriod, formatDate } from "@/lib/utils";

type Expense = {
  id: string; periodYear: number; periodMonth: number; currency: string; category: string; description: string;
  departmentId: string | null; costCentreId: string | null; clientId: string | null; isBillable: boolean;
  toolName: string | null; rate: number | null; seats: number | null;
  departmentName: string | null; costCentreName: string | null; clientName: string | null;
  amountUsd: number | null; amountInr: number | null; conversionRate: number | null; addedByName: string;
};

const INR_CATEGORIES = ["Salary", "Overhead", "Laptop", "Office", "Marketing", "Other"];
const USD_CATEGORIES = ["Zoom", "Lead Gen", "Software", "Subscription", "Ads", "Other"];

export default function ExpensesPage() {
  const { periodYear, periodMonth } = useOpsStore();
  const { data, mutate } = useSWR<{ data: Expense[]; summary: Record<string, number> }>(`/api/expenses?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [catF, setCatF] = React.useState("");
  const [ccF, setCcF] = React.useState("");
  const { data: ref } = useReference();
  const [open, setOpen] = React.useState(false);
  const [currency, setCurrency] = React.useState<"INR" | "USD">("INR");
  const [editing, setEditing] = React.useState<Expense | null>(null);

  const allRaw = data?.data ?? [];
  const all = allRaw.filter((e) => !ccF || e.costCentreId === ccF);
  const isTool = (e: Expense) => e.category === "TOOL_COST";
  const isClient = (e: Expense) => !!e.clientId;
  const inr = all.filter((e) => e.currency === "INR" && !isTool(e) && !isClient(e) && (!catF || e.category === catF));
  const usd = all.filter((e) => e.currency === "USD" && !isTool(e) && !isClient(e) && (!catF || e.category === catF));
  const tools = all.filter(isTool);
  const clientExp = all.filter((e) => isClient(e) && !isTool(e));
  const s = data?.summary;

  const del = async (id: string) => { await apiSend(`/api/expenses/${id}`, "DELETE"); toast("Expense removed"); mutate(); };
  const openAdd = (cur: "INR" | "USD") => { setCurrency(cur); setEditing(null); setOpen(true); };
  const openEdit = (e: Expense) => { setCurrency(e.currency as "INR" | "USD"); setEditing(e); setOpen(true); };

  return (
    <PageShell
      title="Expenses"
      filterBar={
        <FilterBar>
          <FilterSelect value={catF} onChange={setCatF} placeholder="All Categories" options={[...new Set([...INR_CATEGORIES, ...USD_CATEGORIES])].map((c) => ({ value: c, label: c }))} />
          <FilterSelect value={ccF} onChange={setCcF} placeholder="All Cost Centres" options={(ref?.costCentres ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </FilterBar>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total INR (₹)" value={s ? formatInr(s.totalInr) : "—"} />
        <Stat label="Total USD ($)" value={s ? formatUsd(s.totalUsd) : "—"} />
        <Stat label="USD in INR (₹)" value={s ? formatInr(s.usdInInr) : "—"} />
        <Stat label="Combined (₹)" value={s ? formatInr(s.combinedInr) : "—"} />
      </div>

      <Tabs defaultValue="inr" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="inr">INR Expenses</TabsTrigger>
          <TabsTrigger value="usd">USD Expenses</TabsTrigger>
          <TabsTrigger value="tools">Tool Costs</TabsTrigger>
          <TabsTrigger value="clients">Client Expenses</TabsTrigger>
          <TabsTrigger value="resources">Resource Expenses</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="inr">
          <div className="mb-2 flex justify-end"><Button onClick={() => openAdd("INR")}><Plus size={14} /> Add INR Expense</Button></div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Category</th><th>Description</th><th>Department</th><th>Cost Centre</th><th>Amount (₹)</th><th>Added By</th><th></th></tr></thead>
                <tbody>
                  {inr.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-[#94A3B8]">No INR expenses.</td></tr>}
                  {inr.map((e) => (
                    <tr key={e.id} className="border-b border-[#E8ECF4]">
                      <td className="py-2">{formatPeriod(e.periodYear, e.periodMonth)}</td><td>{e.category}</td><td>{e.description}</td>
                      <td>{e.departmentName ?? "—"}</td><td>{e.costCentreName ?? "—"}</td><td>{formatInr(e.amountInr ?? 0)}</td><td>{e.addedByName}</td>
                      <td className="flex gap-1 py-1"><Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil size={12} /></Button><Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 size={12} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="usd">
          <div className="mb-2 flex justify-end"><Button onClick={() => openAdd("USD")}><Plus size={14} /> Add USD Expense</Button></div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Category</th><th>Description</th><th>Department</th><th>Cost Centre</th><th>Amount ($)</th><th>Rate B</th><th>Amount (₹)</th><th>Added By</th><th></th></tr></thead>
                <tbody>
                  {usd.length === 0 && <tr><td colSpan={10} className="py-4 text-center text-[#94A3B8]">No USD expenses.</td></tr>}
                  {usd.map((e) => (
                    <tr key={e.id} className="border-b border-[#E8ECF4]">
                      <td className="py-2">{formatPeriod(e.periodYear, e.periodMonth)}</td><td>{e.category}</td><td>{e.description}</td>
                      <td>{e.departmentName ?? "—"}</td><td>{e.costCentreName ?? "—"}</td><td>{formatUsd(e.amountUsd ?? 0)}</td>
                      <td>₹{e.conversionRate ?? "—"}</td><td>{formatInr(e.amountInr ?? 0)}</td><td>{e.addedByName}</td>
                      <td className="flex gap-1 py-1"><Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil size={12} /></Button><Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 size={12} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <div className="mb-2 text-[11px] text-[#94A3B8]">Read-only — aggregates tool costs added from Resource and Client screens.</div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Source</th><th>Tool Name</th><th>Rate</th><th>Seats</th><th>Total</th><th>Currency</th></tr></thead>
                <tbody>
                  {tools.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-[#94A3B8]">No tool costs. Add them from Resource or Client screens.</td></tr>}
                  {tools.map((e) => (
                    <tr key={e.id} className="border-b border-[#E8ECF4]">
                      <td className="py-2">{formatPeriod(e.periodYear, e.periodMonth)}</td><td>{e.clientName ?? e.costCentreName ?? "Resource"}</td><td>{e.toolName ?? e.description}</td>
                      <td>{e.currency === "USD" ? formatUsd(e.rate ?? 0) : formatInr(e.rate ?? 0)}</td><td>{e.seats ?? "—"}</td>
                      <td>{e.currency === "USD" ? formatUsd(e.amountUsd ?? 0) : formatInr(e.amountInr ?? 0)}</td><td><Badge tone="info">{e.currency}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <div className="mb-2 text-[11px] text-[#94A3B8]">Read-only — client expenses are added from the Client detail screen.</div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Client</th><th>Description</th><th>Category</th><th>Amount</th><th>Currency</th><th>Billable to Client</th></tr></thead>
                <tbody>
                  {clientExp.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-[#94A3B8]">No client expenses.</td></tr>}
                  {clientExp.map((e) => (
                    <tr key={e.id} className="border-b border-[#E8ECF4]">
                      <td className="py-2">{formatPeriod(e.periodYear, e.periodMonth)}</td><td className="font-medium">{e.clientName ?? "—"}</td><td>{e.description}</td><td>{e.category}</td>
                      <td>{e.currency === "USD" ? formatUsd(e.amountUsd ?? 0) : formatInr(e.amountInr ?? 0)}</td><td><Badge tone="info">{e.currency}</Badge></td>
                      <td><Badge tone={e.isBillable ? "success" : "neutral"}>{e.isBillable ? "Yes" : "No"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <ResourceExpensesTab year={periodYear} month={periodMonth} />
        </TabsContent>

        <TabsContent value="assets">
          <AssetsTab />
        </TabsContent>
      </Tabs>

      <ExpenseModal open={open} onOpenChange={setOpen} currency={currency} editing={editing} year={periodYear} month={periodMonth} rateB={s?.rateB ?? 86} onSaved={() => mutate()} />
    </PageShell>
  );
}

type ResCost = { id: string; name: string; department: string; costCentre: string; isBillable: boolean; baseSalary: number; incentive: number; allowance: number; overhead: number; extraMonthly: number; totalCostInr: number };

function ResourceExpensesTab({ year, month }: { year: number; month: number }) {
  const { data: ref } = useReference();
  const [deptF, setDeptF] = React.useState("");
  const { data } = useSWR<{ rows: ResCost[]; summary: { totalCostInr: number; billableCostInr: number; nonBillableCostInr: number } }>(`/api/expenses/resource-costs?year=${year}&month=${month}&departmentId=${deptF}`, apiGet);
  const rows = data?.rows ?? [];
  const sm = data?.summary;
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <FilterSelect value={deptF} onChange={setDeptF} placeholder="All Departments" options={(ref?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <span className="text-[11px] text-[#94A3B8]">Read-only — auto-calculated from resource records.</span>
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label="Total Resource Cost (₹)" value={sm ? formatInr(sm.totalCostInr) : "—"} />
        <Stat label="Billable Resources Cost (₹)" value={sm ? formatInr(sm.billableCostInr) : "—"} />
        <Stat label="Non-billable Resources Cost (₹)" value={sm ? formatInr(sm.nonBillableCostInr) : "—"} />
      </div>
      <Card className="p-4">
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full whitespace-nowrap text-[12px]">
            <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Department</th><th>Cost Centre</th><th>Base Salary</th><th>Incentive</th><th>Allowance</th><th>Overhead</th><th>Extra Costs</th><th>Total Cost</th><th>Period</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={10} className="py-4 text-center text-[#94A3B8]">No active resources for this period.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#E8ECF4] tabular-nums">
                  <td className="py-2 font-medium">{r.name}</td><td>{r.department}</td><td>{r.costCentre}</td>
                  <td>{formatInr(r.baseSalary)}</td><td>{formatInr(r.incentive)}</td><td>{formatInr(r.allowance)}</td>
                  <td>{formatInr(r.overhead)}</td><td>{formatInr(r.extraMonthly)}</td>
                  <td className="font-semibold text-[#0F1629]">{formatInr(r.totalCostInr)}</td><td>{formatPeriod(year, month)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ExpenseModal({ open, onOpenChange, currency, editing, year, month, rateB, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; currency: "INR" | "USD"; editing: Expense | null; year: number; month: number; rateB: number; onSaved: () => void }) {
  const { data: ref } = useReference();
  const cats = currency === "INR" ? INR_CATEGORIES : USD_CATEGORIES;
  const [form, setForm] = React.useState({ periodYear: year, periodMonth: month, category: cats[0], description: "", departmentId: "", costCentreId: "", amount: 0, conversionRate: rateB });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) setForm({ periodYear: editing.periodYear, periodMonth: editing.periodMonth, category: editing.category, description: editing.description, departmentId: editing.departmentId ?? "", costCentreId: editing.costCentreId ?? "", amount: (currency === "USD" ? editing.amountUsd : editing.amountInr) ?? 0, conversionRate: editing.conversionRate ?? rateB });
      else setForm({ periodYear: year, periodMonth: month, category: cats[0], description: "", departmentId: "", costCentreId: "", amount: 0, conversionRate: rateB });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, currency]);

  const amountInr = currency === "USD" ? form.amount * form.conversionRate : form.amount;

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        periodYear: Number(form.periodYear), periodMonth: Number(form.periodMonth), currency,
        category: form.category, description: form.description,
        departmentId: form.departmentId || null, costCentreId: form.costCentreId || null,
      };
      if (currency === "USD") { body.amountUsd = Number(form.amount); body.conversionRate = Number(form.conversionRate); }
      else { body.amountInr = Number(form.amount); }
      if (editing) await apiSend(`/api/expenses/${editing.id}`, "PATCH", body);
      else await apiSend("/api/expenses", "POST", body);
      toast("Expense saved");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${editing ? "Edit" : "Add"} ${currency} Expense`}>
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Month</Label><MonthSelect value={form.periodMonth} onChange={(m) => setForm((f) => ({ ...f, periodMonth: m }))} /></div>
            <div><Label>Year</Label><YearSelect value={form.periodYear} onChange={(y) => setForm((f) => ({ ...f, periodYear: y }))} /></div>
            <div><Label>Category</Label><Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
            <div><Label>Amount ({currency === "USD" ? "$" : "₹"})</Label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Department (optional)</Label><Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}><option value="">None</option>{ref?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
            <div><Label>Cost Centre (optional)</Label><Select value={form.costCentreId} onChange={(e) => setForm((f) => ({ ...f, costCentreId: e.target.value }))}><option value="">None</option>{ref?.costCentres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            {currency === "USD" && (
              <>
                <div><Label>Conversion Rate (Rate B)</Label><Input type="number" value={form.conversionRate} onChange={(e) => setForm((f) => ({ ...f, conversionRate: Number(e.target.value) }))} /></div>
                <div><Label>Amount INR (auto)</Label><Input value={formatInr(amountInr)} disabled /></div>
              </>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.description || !form.amount}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetsTab() {
  const { data: ref } = useReference();
  const [resF, setResF] = React.useState("");
  const [typeF, setTypeF] = React.useState("");
  const [statusF, setStatusF] = React.useState("");
  const { data } = useSWR<{ rows: AssetRow[]; summary: { total: number; issued: number; returned: number; monthlyAmortInr: number } }>(`/api/expenses/assets?resourceId=${resF}&assetType=${typeF}&status=${statusF}`, apiGet);
  const rows = data?.rows ?? [];
  const sm = data?.summary;
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <FilterSelect value={resF} onChange={setResF} placeholder="All Resources" options={(ref?.resources ?? []).map((r) => ({ value: r.id, label: r.name }))} />
        <FilterSelect value={typeF} onChange={setTypeF} placeholder="All Types" options={["LAPTOP","CHARGER","MOUSE","KEYBOARD","MONITOR","HEADSET","OTHER"].map((t) => ({ value: t, label: t }))} />
        <FilterSelect value={statusF} onChange={setStatusF} placeholder="All Status" options={["ISSUED","RETURNED","LOST"].map((t) => ({ value: t, label: t }))} />
        <span className="ml-auto text-[11px] text-[#94A3B8]">Read-only — assets are added from Resource detail.</span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Assets" value={sm ? String(sm.total) : "—"} />
        <Stat label="Active (Issued)" value={sm ? String(sm.issued) : "—"} />
        <Stat label="Returned" value={sm ? String(sm.returned) : "—"} />
        <Stat label="Monthly Amortisation (₹)" value={sm ? formatInr(sm.monthlyAmortInr) : "—"} />
      </div>
      <Card className="p-4">
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full whitespace-nowrap text-[12px]">
            <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Resource</th><th>Asset Type</th><th>Description</th><th>Serial Number</th><th>Issue Date</th><th>Return Date</th><th>Status</th><th>Purchase Cost (₹)</th><th>Monthly Amort. (₹/mo)</th><th>Months Remaining</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={10} className="py-4 text-center text-[#94A3B8]">No assets.</td></tr>}
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-[#E8ECF4]">
                  <td className="py-2 font-medium">{a.resourceName}</td><td>{a.assetType}</td><td>{a.description ?? "—"}</td><td className="font-mono text-[11px]">{a.serialNumber ?? "—"}</td>
                  <td>{formatDate(a.issueDate)}</td><td>{formatDate(a.returnDate)}</td><td><Badge tone={a.status === "ISSUED" ? "success" : "neutral"}>{a.status}</Badge></td>
                  <td>{a.costInr != null ? formatInr(a.costInr) : "—"}</td><td>{formatInr(a.monthlyAmortInr)}</td><td>{a.monthsRemaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

type AssetRow = { id: string; resourceName: string; assetType: string; description: string | null; serialNumber: string | null; issueDate: string; returnDate: string | null; status: string; costInr: number | null; monthlyAmortInr: number; monthsRemaining: number };
