"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { PageShell, Stat } from "@/components/common/PageShell";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useReference } from "@/hooks/useReference";
import { apiGet, apiSend } from "@/lib/api-client";
import { useOpsStore } from "@/store/filterStore";
import { toast } from "@/store/toastStore";
import { formatInr, formatUsd } from "@/lib/utils";

type Expense = {
  id: string; periodYear: number; periodMonth: number; currency: string; category: string; description: string;
  departmentId: string | null; costCentreId: string | null; clientId: string | null; isBillable: boolean;
  toolName: string | null; rate: number | null; seats: number | null;
  departmentName: string | null; costCentreName: string | null; clientName: string | null;
  amountUsd: number | null; amountInr: number | null; conversionRate: number | null; addedByName: string;
};

const INR_CATEGORIES = ["Salary", "Overhead", "Laptop", "Office", "Marketing", "Other"];
const USD_CATEGORIES = ["Zoom", "Lead Gen", "Software", "Subscription", "Ads", "Other"];
const CLIENT_CATEGORIES = ["Travel", "Software", "Subscription", "Hardware", "Reimbursement", "Other"];

export default function ExpensesPage() {
  const { periodYear, periodMonth } = useOpsStore();
  const { data, mutate } = useSWR<{ data: Expense[]; summary: Record<string, number> }>(`/api/expenses?year=${periodYear}&month=${periodMonth}`, apiGet);
  const [catF, setCatF] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [currency, setCurrency] = React.useState<"INR" | "USD">("INR");
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [toolOpen, setToolOpen] = React.useState(false);
  const [toolEditing, setToolEditing] = React.useState<Expense | null>(null);
  const [clientOpen, setClientOpen] = React.useState(false);
  const [clientEditing, setClientEditing] = React.useState<Expense | null>(null);
  const [populating, setPopulating] = React.useState(false);

  const all = data?.data ?? [];
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
  const autoPopulate = async () => { setPopulating(true); try { const r = await apiSend<{ count: number }>("/api/expenses/tool-costs", "POST", { periodYear, periodMonth }); toast(`Populated ${r.count} tool-cost rows`); mutate(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } finally { setPopulating(false); } };

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
          <TabsTrigger value="tools">Tool Costs</TabsTrigger>
          <TabsTrigger value="clients">Client Expenses</TabsTrigger>
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
                      <td className="py-2">{e.periodMonth}/{e.periodYear}</td><td>{e.category}</td><td>{e.description}</td>
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
                      <td className="py-2">{e.periodMonth}/{e.periodYear}</td><td>{e.category}</td><td>{e.description}</td>
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
          <div className="mb-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={autoPopulate} disabled={populating}><RefreshCw size={14} /> {populating ? "Populating…" : "Auto-populate from config"}</Button>
            <Button onClick={() => { setToolEditing(null); setToolOpen(true); }}><Plus size={14} /> Add Tool Cost</Button>
          </div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Cost Centre</th><th>Tool Name</th><th>Rate</th><th>Seats</th><th>Total</th><th>Currency</th><th></th></tr></thead>
                <tbody>
                  {tools.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-[#94A3B8]">No tool costs. Use “Auto-populate from config”.</td></tr>}
                  {tools.map((e) => (
                    <tr key={e.id} className="border-b border-[#E8ECF4]">
                      <td className="py-2">{e.periodMonth}/{e.periodYear}</td><td>{e.costCentreName ?? "—"}</td><td>{e.toolName ?? e.description}</td>
                      <td>{e.currency === "USD" ? formatUsd(e.rate ?? 0) : formatInr(e.rate ?? 0)}</td><td>{e.seats ?? "—"}</td>
                      <td>{e.currency === "USD" ? formatUsd(e.amountUsd ?? 0) : formatInr(e.amountInr ?? 0)}</td><td><Badge tone="info">{e.currency}</Badge></td>
                      <td className="flex gap-1 py-1"><Button size="sm" variant="ghost" onClick={() => { setToolEditing(e); setToolOpen(true); }}><Pencil size={12} /></Button><Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 size={12} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <div className="mb-2 flex justify-end"><Button onClick={() => { setClientEditing(null); setClientOpen(true); }}><Plus size={14} /> Add Client Expense</Button></div>
          <Card className="p-4">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full whitespace-nowrap text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Month</th><th>Client</th><th>Description</th><th>Category</th><th>Amount</th><th>Currency</th><th>Billable to Client</th><th></th></tr></thead>
                <tbody>
                  {clientExp.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-[#94A3B8]">No client expenses.</td></tr>}
                  {clientExp.map((e) => (
                    <tr key={e.id} className="border-b border-[#E8ECF4]">
                      <td className="py-2">{e.periodMonth}/{e.periodYear}</td><td className="font-medium">{e.clientName ?? "—"}</td><td>{e.description}</td><td>{e.category}</td>
                      <td>{e.currency === "USD" ? formatUsd(e.amountUsd ?? 0) : formatInr(e.amountInr ?? 0)}</td><td><Badge tone="info">{e.currency}</Badge></td>
                      <td><Badge tone={e.isBillable ? "success" : "neutral"}>{e.isBillable ? "Yes" : "No"}</Badge></td>
                      <td className="flex gap-1 py-1"><Button size="sm" variant="ghost" onClick={() => { setClientEditing(e); setClientOpen(true); }}><Pencil size={12} /></Button><Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 size={12} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ExpenseModal open={open} onOpenChange={setOpen} currency={currency} editing={editing} year={periodYear} month={periodMonth} rateB={s?.rateB ?? 86} onSaved={() => mutate()} />
      <ToolCostModal open={toolOpen} onOpenChange={setToolOpen} editing={toolEditing} year={periodYear} month={periodMonth} rateB={s?.rateB ?? 86} onSaved={() => mutate()} />
      <ClientExpenseModal open={clientOpen} onOpenChange={setClientOpen} editing={clientEditing} year={periodYear} month={periodMonth} rateB={s?.rateB ?? 86} onSaved={() => mutate()} />
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

function ToolCostModal({ open, onOpenChange, editing, year, month, rateB, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Expense | null; year: number; month: number; rateB: number; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ periodYear: year, periodMonth: month, currency: "INR" as "INR" | "USD", costCentreId: "", toolName: "", rate: 0, seats: 1, conversionRate: rateB });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) setForm({ periodYear: editing.periodYear, periodMonth: editing.periodMonth, currency: editing.currency as "INR" | "USD", costCentreId: editing.costCentreId ?? "", toolName: editing.toolName ?? "", rate: editing.rate ?? 0, seats: editing.seats ?? 1, conversionRate: editing.conversionRate ?? rateB });
      else setForm({ periodYear: year, periodMonth: month, currency: "INR", costCentreId: "", toolName: "", rate: 0, seats: 1, conversionRate: rateB });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const total = form.rate * form.seats;
  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        periodYear: Number(form.periodYear), periodMonth: Number(form.periodMonth), currency: form.currency,
        category: "TOOL_COST", description: `${form.toolName}${form.costCentreId ? "" : ""}`, toolName: form.toolName,
        costCentreId: form.costCentreId || null, rate: Number(form.rate), seats: Number(form.seats),
      };
      if (form.currency === "USD") { body.amountUsd = total; body.conversionRate = Number(form.conversionRate); }
      else { body.amountInr = total; }
      if (editing) await apiSend(`/api/expenses/${editing.id}`, "PATCH", body);
      else await apiSend("/api/expenses", "POST", body);
      toast("Tool cost saved"); onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${editing ? "Edit" : "Add"} Tool Cost`}>
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Month</Label><Input type="number" min={1} max={12} value={form.periodMonth} onChange={(e) => setForm((f) => ({ ...f, periodMonth: Number(e.target.value) }))} /></div>
            <div><Label>Year</Label><Input type="number" value={form.periodYear} onChange={(e) => setForm((f) => ({ ...f, periodYear: Number(e.target.value) }))} /></div>
            <div className="col-span-2"><Label>Tool Name</Label><Input value={form.toolName} onChange={(e) => setForm((f) => ({ ...f, toolName: e.target.value }))} /></div>
            <div><Label>Cost Centre</Label><Select value={form.costCentreId} onChange={(e) => setForm((f) => ({ ...f, costCentreId: e.target.value }))}><option value="">None</option>{ref?.costCentres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><Label>Currency</Label><Select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as "INR" | "USD" }))}><option value="INR">INR</option><option value="USD">USD</option></Select></div>
            <div><Label>Rate ({form.currency === "USD" ? "$" : "₹"}/seat)</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))} /></div>
            <div><Label>Seats</Label><Input type="number" value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))} /></div>
            {form.currency === "USD" && <div><Label>Conversion Rate (Rate B)</Label><Input type="number" value={form.conversionRate} onChange={(e) => setForm((f) => ({ ...f, conversionRate: Number(e.target.value) }))} /></div>}
            <div><Label>Total ({form.currency === "USD" ? "$" : "₹"})</Label><Input value={form.currency === "USD" ? formatUsd(total) : formatInr(total)} disabled /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.toolName || !form.rate}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientExpenseModal({ open, onOpenChange, editing, year, month, rateB, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Expense | null; year: number; month: number; rateB: number; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ periodYear: year, periodMonth: month, currency: "INR" as "INR" | "USD", clientId: "", description: "", category: CLIENT_CATEGORIES[0], amount: 0, isBillable: false, conversionRate: rateB });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) setForm({ periodYear: editing.periodYear, periodMonth: editing.periodMonth, currency: editing.currency as "INR" | "USD", clientId: editing.clientId ?? "", description: editing.description, category: editing.category, amount: (editing.currency === "USD" ? editing.amountUsd : editing.amountInr) ?? 0, isBillable: editing.isBillable, conversionRate: editing.conversionRate ?? rateB });
      else setForm({ periodYear: year, periodMonth: month, currency: "INR", clientId: "", description: "", category: CLIENT_CATEGORIES[0], amount: 0, isBillable: false, conversionRate: rateB });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        periodYear: Number(form.periodYear), periodMonth: Number(form.periodMonth), currency: form.currency,
        category: form.category, description: form.description, clientId: form.clientId || null, isBillable: form.isBillable,
      };
      if (form.currency === "USD") { body.amountUsd = Number(form.amount); body.conversionRate = Number(form.conversionRate); }
      else { body.amountInr = Number(form.amount); }
      if (editing) await apiSend(`/api/expenses/${editing.id}`, "PATCH", body);
      else await apiSend("/api/expenses", "POST", body);
      toast("Client expense saved"); onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${editing ? "Edit" : "Add"} Client Expense`}>
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Month</Label><Input type="number" min={1} max={12} value={form.periodMonth} onChange={(e) => setForm((f) => ({ ...f, periodMonth: Number(e.target.value) }))} /></div>
            <div><Label>Year</Label><Input type="number" value={form.periodYear} onChange={(e) => setForm((f) => ({ ...f, periodYear: Number(e.target.value) }))} /></div>
            <div className="col-span-2"><Label>Client</Label><Select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}><option value="">Select client…</option>{ref?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Category</Label><Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{CLIENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
            <div><Label>Currency</Label><Select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as "INR" | "USD" }))}><option value="INR">INR</option><option value="USD">USD</option></Select></div>
            <div><Label>Amount ({form.currency === "USD" ? "$" : "₹"})</Label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} /></div>
            {form.currency === "USD" && <div><Label>Conversion Rate (Rate B)</Label><Input type="number" value={form.conversionRate} onChange={(e) => setForm((f) => ({ ...f, conversionRate: Number(e.target.value) }))} /></div>}
            <label className="col-span-2 flex items-center gap-2 text-[12px] text-[#64748B]"><Switch checked={form.isBillable} onCheckedChange={(v) => setForm((f) => ({ ...f, isBillable: v }))} /> Billable to Client</label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.clientId || !form.description || !form.amount}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
