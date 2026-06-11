"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { useReference } from "@/hooks/useReference";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { toast } from "@/store/toastStore";
import { formatInr, formatUsd } from "@/lib/utils";

type Expense = {
  id: string; periodYear: number; periodMonth: number; currency: string; category: string; description: string;
  departmentId: string | null; costCentreId: string | null; departmentName: string | null; costCentreName: string | null;
  amountUsd: number | null; amountInr: number | null; conversionRate: number | null; addedByName: string;
};

const INR_CATEGORIES = ["Salary", "Tool Cost", "Overhead", "Laptop", "Office", "Marketing", "Other"];
const USD_CATEGORIES = ["Zoom", "Lead Gen", "Software", "Subscription", "Ads", "Other"];

export default function ExpensesPage() {
  const { periodYear, periodMonth } = useOpsStore();
  const { data, isLoading, mutate } = useSWR<{ data: Expense[]; summary: Record<string, number> }>(`/api/expenses?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [catF, setCatF] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [currency, setCurrency] = React.useState<"INR" | "USD">("INR");
  const [editing, setEditing] = React.useState<Expense | null>(null);

  const all = data?.data ?? [];
  const inr = all.filter((e) => e.currency === "INR" && (!catF || e.category === catF));
  const usd = all.filter((e) => e.currency === "USD" && (!catF || e.category === catF));
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
        </TabsList>

        <TabsContent value="inr">
          <div className="mb-2 flex justify-end"><Button onClick={() => openAdd("INR")}><Plus size={14} /> Add INR Expense</Button></div>
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Category</th><th>Description</th><th>Department</th><th>Cost Centre</th><th>Amount (₹)</th><th>Added By</th><th></th></tr></thead>
              <tbody>
                {inr.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-[#94A3B8]">No INR expenses.</td></tr>}
                {inr.map((e) => (
                  <tr key={e.id} className="border-b border-[#E8ECF4]">
                    <td className="py-2">{e.periodMonth}/{e.periodYear}</td><td>{e.category}</td><td>{e.description}</td>
                    <td>{e.departmentName ?? "—"}</td><td>{e.costCentreName ?? "—"}</td><td>{formatInr(e.amountInr ?? 0)}</td><td>{e.addedByName}</td>
                    <td className="flex gap-1 py-1"><Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil size={12} /></Button><Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 size={12} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="usd">
          <div className="mb-2 flex justify-end"><Button onClick={() => openAdd("USD")}><Plus size={14} /> Add USD Expense</Button></div>
          <Card className="p-4">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Category</th><th>Description</th><th>Department</th><th>Cost Centre</th><th>Amount ($)</th><th>Rate B</th><th>Amount (₹)</th><th>Added By</th><th></th></tr></thead>
              <tbody>
                {usd.length === 0 && <tr><td colSpan={10} className="py-4 text-center text-[#94A3B8]">No USD expenses.</td></tr>}
                {usd.map((e) => (
                  <tr key={e.id} className="border-b border-[#E8ECF4]">
                    <td className="py-2">{e.periodMonth}/{e.periodYear}</td><td>{e.category}</td><td>{e.description}</td>
                    <td>{e.departmentName ?? "—"}</td><td>{e.costCentreName ?? "—"}</td><td>{formatUsd(e.amountUsd ?? 0)}</td>
                    <td>₹{e.conversionRate ?? "—"}</td><td>{formatInr(e.amountInr ?? 0)}</td><td>{e.addedByName}</td>
                    <td className="flex gap-1 py-1"><Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil size={12} /></Button><Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 size={12} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      <ExpenseModal open={open} onOpenChange={setOpen} currency={currency} editing={editing} year={periodYear} month={periodMonth} rateB={s?.rateB ?? 86} onSaved={() => mutate()} />
    </PageShell>
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
            <div><Label>Month</Label><Input type="number" min={1} max={12} value={form.periodMonth} onChange={(e) => setForm((f) => ({ ...f, periodMonth: Number(e.target.value) }))} /></div>
            <div><Label>Year</Label><Input type="number" value={form.periodYear} onChange={(e) => setForm((f) => ({ ...f, periodYear: Number(e.target.value) }))} /></div>
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
