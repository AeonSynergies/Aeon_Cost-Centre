"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

type Settings = { config: Record<string, number>; allocations: { year: number; deptReservePct: number; businessDevPct: number; productDevPct: number; profitPct: number }[] };
type Category = { id: string; key: string; name: string; isBuiltIn: boolean };

const SECTIONS: { id: string; label: string; fields: { key: string; label: string }[] }[] = [
  { id: "general", label: "General", fields: [
    { key: "overhead_pct", label: "Overhead %" },
    { key: "working_days_per_month", label: "Working Days / Month" },
    { key: "available_hrs_per_day", label: "Available Hrs / Day" },
    { key: "laptop_amortisation_months", label: "Laptop Amortisation (months)" },
  ] },
  { id: "currency", label: "Currency", fields: [
    { key: "usd_inr_fixed_rate", label: "Fixed Rate A" },
    { key: "usd_inr_market_rate", label: "Market Rate" },
    { key: "expense_markup_b", label: "Expense Markup B (+)" },
    { key: "skydo_markup", label: "Skydo Markup C (−)" },
    { key: "expense_markup_d", label: "Display Markup D (−)" },
  ] },
  { id: "revenue", label: "Revenue", fields: [
    { key: "skydo_fee_pct", label: "Skydo Fee %" },
    { key: "abbie_royalty_pct", label: "Abbie Royalty %" },
    { key: "reserve_fund_pct", label: "Reserve Fund %" },
    { key: "card_txn_fee_pct", label: "Card Txn Fee %" },
    { key: "ach_txn_fee_pct", label: "ACH Txn Fee %" },
    { key: "stripe_card_pct", label: "Stripe Card %" },
    { key: "stripe_card_fixed", label: "Stripe Card Fixed ($)" },
    { key: "stripe_ach_pct", label: "Stripe ACH %" },
    { key: "stripe_ach_min", label: "Stripe ACH Min ($)" },
  ] },
];

export default function SettingsPage() {
  const { data, mutate } = useSWR<Settings>("/api/settings", apiGet);

  return (
    <PageShell title="Settings">
      <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {SECTIONS.map((sec) => (
          <TabsContent key={sec.id} value={sec.id}>
            {data && <ConfigSection fields={sec.fields} config={data.config} onSaved={() => mutate()} />}
          </TabsContent>
        ))}

        <TabsContent value="allocation">
          {data?.allocations.map((a) => <AllocationSection key={a.year} alloc={a} onSaved={() => mutate()} />)}
          {[2026, 2027].filter((y) => !data?.allocations.some((a) => a.year === y)).map((y) => (
            <AllocationSection key={y} alloc={{ year: y, deptReservePct: 50, businessDevPct: 30, productDevPct: 20, profitPct: 0 }} onSaved={() => mutate()} />
          ))}
        </TabsContent>

        <TabsContent value="categories"><CategoriesSection /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

function ConfigSection({ fields, config, onSaved }: { fields: { key: string; label: string }[]; config: Record<string, number>; onSaved: () => void }) {
  const [values, setValues] = React.useState<Record<string, number>>(() => Object.fromEntries(fields.map((f) => [f.key, config[f.key] ?? 0])));
  const [saving, setSaving] = React.useState(false);
  const save = async () => {
    setSaving(true);
    try { await apiSend("/api/settings", "POST", { values }); toast("Settings saved"); onSaved(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setSaving(false); }
  };
  return (
    <Card className="max-w-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}><Label>{f.label}</Label><Input type="number" step="0.01" value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))} /></div>
        ))}
      </div>
      <div className="mt-3 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
    </Card>
  );
}

function AllocationSection({ alloc, onSaved }: { alloc: Settings["allocations"][number]; onSaved: () => void }) {
  const [v, setV] = React.useState(alloc);
  const [saving, setSaving] = React.useState(false);
  const sum = v.deptReservePct + v.businessDevPct + v.productDevPct + v.profitPct;
  const valid = Math.abs(sum - 100) < 0.001;
  const save = async () => {
    setSaving(true);
    try { await apiSend("/api/settings/allocation", "POST", v); toast(`Allocation ${v.year} saved`); onSaved(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setSaving(false); }
  };
  return (
    <Card className="mb-3 max-w-2xl p-4">
      <SectionTitle>{v.year}</SectionTitle>
      <div className="mt-2 grid grid-cols-4 gap-3">
        <div><Label>Dept %</Label><Input type="number" value={v.deptReservePct} onChange={(e) => setV((s) => ({ ...s, deptReservePct: Number(e.target.value) }))} /></div>
        <div><Label>BD %</Label><Input type="number" value={v.businessDevPct} onChange={(e) => setV((s) => ({ ...s, businessDevPct: Number(e.target.value) }))} /></div>
        <div><Label>Product %</Label><Input type="number" value={v.productDevPct} onChange={(e) => setV((s) => ({ ...s, productDevPct: Number(e.target.value) }))} /></div>
        <div><Label>Profit %</Label><Input type="number" value={v.profitPct} onChange={(e) => setV((s) => ({ ...s, profitPct: Number(e.target.value) }))} /></div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[12px] font-semibold ${valid ? "text-[#1D9E75]" : "text-[#D85A30]"}`}>Sum: {sum}% {valid ? "✓" : "(must equal 100%)"}</span>
        <Button onClick={save} disabled={saving || !valid}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </Card>
  );
}

function CategoriesSection() {
  const { data, mutate } = useSWR<{ data: Category[] }>("/api/settings/categories", apiGet);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const add = async () => {
    setSaving(true);
    try { await apiSend("/api/settings/categories", "POST", { name }); toast("Category added"); setName(""); setOpen(false); mutate(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setSaving(false); }
  };
  const del = async (id: string) => {
    try { await apiSend(`/api/settings/categories/${id}`, "DELETE"); toast("Category removed"); mutate(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Department Categories</SectionTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} /> Add Category</Button>
      </div>
      <table className="mt-2 w-full text-[12px]">
        <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Category Name</th><th>Type</th><th></th></tr></thead>
        <tbody>
          {data?.data.map((c) => (
            <tr key={c.id} className="border-b border-[#E8ECF4]">
              <td className="py-2 font-medium">{c.name}</td>
              <td><Badge tone={c.isBuiltIn ? "neutral" : "purple"}>{c.isBuiltIn ? "Built-in" : "Custom"}</Badge></td>
              <td className="py-1 text-right">{!c.isBuiltIn && <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 size={12} /></Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add Category" width={420}>
          <DialogBody><Label>Category Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></DialogBody>
          <DialogFooter><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add} disabled={saving || !name}>{saving ? "Saving…" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
