"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2, Pencil, Lock } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { ActivityModal, type ActivityEditing } from "@/components/services/ActivityModal";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

type Settings = {
  config: Record<string, number>;
  allocations: { year: number; effectiveFrom: string; deptReservePct: number; businessDevPct: number; productDevPct: number; profitPct: number }[];
  costCentres: { id: string; name: string; ms365RateInr: number; zoomRateUsd: number }[];
  googleWorkspaceInr: number;
};

const GENERAL = [
  { key: "working_days_per_month", label: "Default Working Days / Month" },
  { key: "available_hrs_per_day", label: "Available Hours / Day" },
  { key: "overhead_pct", label: "Default Overhead %" },
  { key: "overhead_enabled", label: "Include Overhead (1 = on, 0 = off)" },
  { key: "laptop_amortisation_months", label: "Laptop Amortisation (months)" },
];
const REVENUE = [
  { key: "skydo_fee_pct", label: "Skydo Fee %" }, { key: "abbie_royalty_pct", label: "Abbie Royalty %" },
  { key: "reserve_fund_pct", label: "Reserve Fund %" }, { key: "card_txn_fee_pct", label: "Card Transaction Fee %" },
  { key: "ach_txn_fee_pct", label: "ACH Transaction Fee %" }, { key: "stripe_card_pct", label: "Stripe Card %" },
  { key: "stripe_card_fixed", label: "Stripe Card Fixed Fee $" }, { key: "stripe_ach_pct", label: "Stripe ACH %" },
  { key: "stripe_ach_cap", label: "Stripe ACH Cap $" },
];

export default function SettingsPage() {
  const { data, mutate } = useSWR<Settings>("/api/settings", apiGet);

  return (
    <PageShell title="Settings">
      <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          {["General", "Currency", "Revenue", "Allocation", "Utilisation", "Activities", "Categories"].map((t) => (
            <TabsTrigger key={t} value={t.toLowerCase().replace(/ /g, "-")}>{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">{data && <ConfigSection fields={GENERAL} config={data.config} title="Save General Settings" onSaved={mutate} />}</TabsContent>
        <TabsContent value="currency">{data && <CurrencySection config={data.config} onSaved={mutate} />}</TabsContent>
        <TabsContent value="revenue">
          {data && <>
            <div className="mb-3 rounded-[7px] bg-[#FAEEDA] px-3 py-2 text-[12px] text-[#633806]">Changing these values affects all future billing calculations. Existing finalised billing records will not be recalculated.</div>
            <ConfigSection fields={REVENUE} config={data.config} title="Save Revenue Settings" onSaved={mutate} />
          </>}
        </TabsContent>
        <TabsContent value="allocation">
          <AllocationTab allocations={data?.allocations ?? []} onSaved={mutate} />
        </TabsContent>
        <TabsContent value="utilisation"><UtilisationSection /></TabsContent>
        <TabsContent value="activities"><ActivitiesSection /></TabsContent>
        <TabsContent value="categories"><CategoriesSection /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

function ConfigSection({ fields, config, title, onSaved }: { fields: { key: string; label: string }[]; config: Record<string, number>; title: string; onSaved: () => void }) {
  const [values, setValues] = React.useState<Record<string, number>>(() => Object.fromEntries(fields.map((f) => [f.key, config[f.key] ?? 0])));
  const [saving, setSaving] = React.useState(false);
  const save = async () => {
    setSaving(true);
    try { await apiSend("/api/settings", "POST", { values }); toast("Settings saved"); onSaved(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } finally { setSaving(false); }
  };
  return (
    <Card className="max-w-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}><Label>{f.label}</Label><Input type="number" step="0.01" value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))} /></div>
        ))}
      </div>
      <div className="mt-3 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : title}</Button></div>
    </Card>
  );
}

function CurrencySection({ config, onSaved }: { config: Record<string, number>; onSaved: () => void }) {
  const [v, setV] = React.useState({
    usd_inr_fixed_rate: config.usd_inr_fixed_rate ?? 91,
    usd_inr_market_rate: config.usd_inr_market_rate ?? 84,
    expense_markup_b: config.expense_markup_b ?? 2,
    skydo_markup: config.skydo_markup ?? 2,
    expense_markup_d: config.expense_markup_d ?? 4,
  });
  const [saving, setSaving] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [fetchedAt, setFetchedAt] = React.useState<string | null>(null);
  const rateB = v.usd_inr_market_rate + v.expense_markup_b;
  const rateC = v.usd_inr_market_rate - v.skydo_markup;
  const rateD = v.usd_inr_market_rate - v.expense_markup_d;
  const save = async () => { setSaving(true); try { await apiSend("/api/settings", "POST", { values: v }); toast("Currency settings saved"); onSaved(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } finally { setSaving(false); } };

  const fetchLiveRate = async () => {
    setFetching(true);
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (!res.ok) throw new Error("Rate service unavailable");
      const json = await res.json();
      const inr = json?.rates?.INR;
      if (typeof inr !== "number") throw new Error("INR rate not found");
      setV((s) => ({ ...s, usd_inr_market_rate: Math.round(inr * 100) / 100 }));
      setFetchedAt(new Date().toLocaleString());
      toast("Live market rate fetched — review and save");
    } catch (e) { toast(e instanceof Error ? e.message : "Failed to fetch rate", "error"); }
    finally { setFetching(false); }
  };

  const rows: { label: string; k: keyof typeof v; desc: string; derived?: number }[] = [
    { label: "Rate A — USD → INR Fixed", k: "usd_inr_fixed_rate", desc: "Used to convert client USD payments to Net Revenue (INR)." },
    { label: "Market Rate", k: "usd_inr_market_rate", desc: "Base market rate — used in Rate B, C, D calculations." },
    { label: "Expense Markup B (+)", k: "expense_markup_b", desc: "Rate B: converts USD tool costs (Zoom, Lead Gen) to INR.", derived: rateB },
    { label: "Skydo Markup C (−)", k: "skydo_markup", desc: "Rate C: actual Skydo USD → INR conversion rate.", derived: rateC },
    { label: "Expense Markup D (−)", k: "expense_markup_d", desc: "Rate D: displays INR salaries in USD equivalent.", derived: rateD },
  ];

  return (
    <Card className="max-w-2xl p-4">
      {rows.map((row) => (
        <div key={row.k} className="border-b border-[#E8ECF4] py-3">
          <div className="flex items-center gap-3">
            <div className="w-56"><Label className="mb-0">{row.label}</Label></div>
            <Input className="w-28" type="number" step="0.01" value={v[row.k]} onChange={(e) => setV((s) => ({ ...s, [row.k]: Number(e.target.value) }))} />
            {row.derived !== undefined && <span className="text-[12px] font-semibold text-[#1D9E75]">= ₹{row.derived}</span>}
            {row.k === "usd_inr_market_rate" && (
              <>
                <Button size="sm" variant="secondary" onClick={fetchLiveRate} disabled={fetching}>{fetching ? "Fetching…" : "Fetch Live Rate"}</Button>
                {fetchedAt && <span className="text-[11px] text-[#94A3B8]">Last updated: {fetchedAt}</span>}
              </>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[#94A3B8]">{row.desc}</p>
        </div>
      ))}
      <div className="mt-3 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Currency Settings"}</Button></div>
    </Card>
  );
}

function AllocationTab({ allocations, onSaved }: { allocations: Settings["allocations"]; onSaved: () => void }) {
  const [addOpen, setAddOpen] = React.useState(false);
  const shown = allocations.length ? allocations : [];
  return (
    <>
      <div className="mb-3 flex justify-end"><Button size="sm" onClick={() => setAddOpen(true)}><Plus size={13} /> Add Allocation</Button></div>
      {shown.map((a) => <AllocationSection key={a.year} alloc={a} onSaved={onSaved} />)}
      {shown.length === 0 && <Card className="max-w-2xl p-4 text-[12px] text-[#94A3B8]">No allocation configured yet. Use “Add Allocation”.</Card>}
      <AllocationModal open={addOpen} onOpenChange={setAddOpen} existingYears={allocations.map((a) => a.year)} onSaved={onSaved} />
    </>
  );
}

function AllocationSection({ alloc, onSaved }: { alloc: Settings["allocations"][number]; onSaved: () => void }) {
  const [v, setV] = React.useState(alloc);
  const [effectiveFrom, setEffectiveFrom] = React.useState((alloc.effectiveFrom ?? "").slice(0, 10) || `${alloc.year}-01-01`);
  const [saving, setSaving] = React.useState(false);
  const sum = v.deptReservePct + v.businessDevPct + v.productDevPct + v.profitPct;
  const valid = Math.abs(sum - 100) < 0.001;
  const save = async () => { setSaving(true); try { await apiSend("/api/settings/allocation", "POST", { ...v, effectiveFrom }); toast(`Allocation ${v.year} saved`); onSaved(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } finally { setSaving(false); } };
  return (
    <Card className="mb-3 max-w-2xl p-4">
      <div className="flex items-center justify-between"><SectionTitle>{v.year}</SectionTitle><span className="text-[11px] text-[#94A3B8]">Effective from {effectiveFrom}</span></div>
      <div className="mt-2 grid grid-cols-4 gap-3">
        <div><Label>Dept Reserve %</Label><Input type="number" value={v.deptReservePct} onChange={(e) => setV((s) => ({ ...s, deptReservePct: Number(e.target.value) }))} /></div>
        <div><Label>Business Dev %</Label><Input type="number" value={v.businessDevPct} onChange={(e) => setV((s) => ({ ...s, businessDevPct: Number(e.target.value) }))} /></div>
        <div><Label>Product Dev %</Label><Input type="number" value={v.productDevPct} onChange={(e) => setV((s) => ({ ...s, productDevPct: Number(e.target.value) }))} /></div>
        <div><Label>Profit %</Label><Input type="number" value={v.profitPct} onChange={(e) => setV((s) => ({ ...s, profitPct: Number(e.target.value) }))} /></div>
        <div><Label>Effective From</Label><Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[12px] font-semibold ${valid ? "text-[#1D9E75]" : "text-[#D85A30]"}`}>{valid ? `Sum: 100% ✓` : `Percentages must sum to 100%. Current total: ${sum}%`}</span>
        <Button onClick={save} disabled={saving || !valid}>{saving ? "Saving…" : `Save Allocation for ${v.year}`}</Button>
      </div>
    </Card>
  );
}

function AllocationModal({ open, onOpenChange, existingYears, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; existingYears: number[]; onSaved: () => void }) {
  const [form, setForm] = React.useState({ year: new Date().getFullYear(), effectiveFrom: new Date().toISOString().slice(0, 10), deptReservePct: 50, businessDevPct: 30, productDevPct: 20, profitPct: 0 });
  const [saving, setSaving] = React.useState(false);
  const sum = form.deptReservePct + form.businessDevPct + form.productDevPct + form.profitPct;
  const valid = Math.abs(sum - 100) < 0.001;
  const save = async () => {
    setSaving(true);
    try {
      await apiSend("/api/settings/allocation", "POST", { year: Number(form.year), effectiveFrom: form.effectiveFrom, deptReservePct: form.deptReservePct, businessDevPct: form.businessDevPct, productDevPct: form.productDevPct, profitPct: form.profitPct });
      toast(`Allocation ${form.year} saved`); onSaved(); onOpenChange(false);
    } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add Allocation" width={460}>
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} />{existingYears.includes(Number(form.year)) && <p className="mt-1 text-[10px] text-[#BA7517]">Overwrites the existing {form.year} allocation.</p>}</div>
            <div><Label>Effective From</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></div>
            <div><Label>Dept Reserve %</Label><Input type="number" value={form.deptReservePct} onChange={(e) => setForm((f) => ({ ...f, deptReservePct: Number(e.target.value) }))} /></div>
            <div><Label>Business Dev %</Label><Input type="number" value={form.businessDevPct} onChange={(e) => setForm((f) => ({ ...f, businessDevPct: Number(e.target.value) }))} /></div>
            <div><Label>Product Dev %</Label><Input type="number" value={form.productDevPct} onChange={(e) => setForm((f) => ({ ...f, productDevPct: Number(e.target.value) }))} /></div>
            <div><Label>Profit %</Label><Input type="number" value={form.profitPct} onChange={(e) => setForm((f) => ({ ...f, profitPct: Number(e.target.value) }))} /></div>
          </div>
          <div className={`mt-2 text-[12px] font-semibold ${valid ? "text-[#1D9E75]" : "text-[#D85A30]"}`}>{valid ? "Sum: 100% ✓" : `Percentages must sum to 100%. Current total: ${sum}%`}</div>
        </DialogBody>
        <DialogFooter><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !valid}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ServiceTier = { serviceId: string; serviceCode: string; serviceName: string; tiers: { tierNumber: number; maxTxnVolume: number; hoursPerDay: number; effectiveFrom: string }[] };

function UtilisationSection() {
  const { data: ruleData, mutate: mutateRules } = useSWR<{ data: Record<string, number> }>("/api/settings/invoice-rules", apiGet);
  const [rules, setRules] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (ruleData) setRules(ruleData.data); }, [ruleData]);

  const saveRules = async () => { setBusy(true); try { await apiSend("/api/settings/invoice-rules", "PATCH", rules); toast("Invoice rules saved"); mutateRules(); } finally { setBusy(false); } };

  return (
    <div className="space-y-3">
      <ServiceTiersSection />

      <Card className="max-w-2xl p-4">
        <SectionTitle>Invoice Validation Rules</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
          {[["route_threshold", "Route Threshold"], ["below_threshold_hrs", "Below Threshold Hrs"], ["above_threshold_hrs", "Above Threshold Hrs"], ["fleet_addon", "Fleet Add-on"], ["marsh_addon", "Marsh Add-on"]].map(([k, l]) => (
            <div key={k}><Label>{l}</Label><Input type="number" step="0.01" value={rules[k] ?? 0} onChange={(e) => setRules((r) => ({ ...r, [k]: Number(e.target.value) }))} /></div>
          ))}
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={saveRules} disabled={busy}>Save Invoice Rules</Button></div>
      </Card>
    </div>
  );
}

function ActivitiesSection() {
  const { data: actData, mutate: mutateActs } = useSWR<{ data: { id: string; name: string; defaultExpectedHoursPerDay: number; serviceId: string; serviceCode: string; serviceName: string }[] }>("/api/settings/activities", apiGet);
  const [actModal, setActModal] = React.useState(false);
  const [editAct, setEditAct] = React.useState<ActivityEditing | null>(null);
  const [svcFilter, setSvcFilter] = React.useState("");

  const delAct = async (a: { id: string; serviceId: string }) => { await apiSend(`/api/services/${a.serviceId}/activities/${a.id}`, "DELETE"); toast("Activity removed"); mutateActs(); };
  const acts = (actData?.data ?? []).filter((a) => !svcFilter || a.serviceId === svcFilter);
  const services = Array.from(new Map((actData?.data ?? []).map((a) => [a.serviceId, { id: a.serviceId, code: a.serviceCode }])).values());

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Activities Library</SectionTitle>
        <div className="flex items-center gap-2">
          <Select className="h-[30px] w-40" value={svcFilter} onChange={(e) => setSvcFilter(e.target.value)}><option value="">All Services</option>{services.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}</Select>
          <Button size="sm" onClick={() => { setEditAct(null); setActModal(true); }}><Plus size={13} /> Add Activity</Button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-[#94A3B8]">Shared with the Services screen — changes reflect in /services/[id] and vice versa.</p>
      <table className="mt-2 w-full text-[12px]">
        <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Service</th><th>Activity</th><th>Default Hrs/Day</th><th></th></tr></thead>
        <tbody>
          {acts.map((a) => (
            <tr key={a.id} className="border-b border-[#E8ECF4]">
              <td className="py-2 font-mono text-[11px]">{a.serviceCode}</td><td>{a.name}</td><td>{a.defaultExpectedHoursPerDay}</td>
              <td className="flex gap-1 py-1"><Button size="sm" variant="ghost" onClick={() => { setEditAct({ id: a.id, serviceId: a.serviceId, name: a.name, defaultExpectedHoursPerDay: a.defaultExpectedHoursPerDay }); setActModal(true); }}><Pencil size={12} /></Button><Button size="sm" variant="ghost" onClick={() => delAct(a)}><Trash2 size={12} /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <ActivityModal open={actModal} onOpenChange={setActModal} editing={editAct} allowServicePick onSaved={() => mutateActs()} />
    </Card>
  );
}

function ServiceTiersSection() {
  const { data, mutate } = useSWR<{ data: ServiceTier[] }>("/api/settings/service-tiers", apiGet);
  return (
    <Card className="p-4">
      <SectionTitle>Utilisation Tiers by Service</SectionTitle>
      <p className="mt-1 text-[11px] text-[#94A3B8]">Tiers map a service&apos;s daily transaction volume to service hours/day. Each save is effective-dated.</p>
      <div className="mt-3 space-y-4">
        {(data?.data ?? []).length === 0 && <div className="text-[12px] text-[#94A3B8]">No services configured.</div>}
        {data?.data.map((svc) => <ServiceTierEditor key={svc.serviceId} svc={svc} onSaved={mutate} />)}
      </div>
    </Card>
  );
}

function ServiceTierEditor({ svc, onSaved }: { svc: ServiceTier; onSaved: () => void }) {
  const [tiers, setTiers] = React.useState(svc.tiers.length ? svc.tiers.map((t) => ({ maxTxnVolume: t.maxTxnVolume, hoursPerDay: t.hoursPerDay })) : [{ maxTxnVolume: 0, hoursPerDay: 0 }]);
  const [effectiveFrom, setEffectiveFrom] = React.useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = React.useState(false);
  const save = async () => { setBusy(true); try { await apiSend("/api/settings/service-tiers", "PUT", { serviceId: svc.serviceId, effectiveFrom, tiers }); toast(`${svc.serviceCode} tiers saved`); onSaved(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } finally { setBusy(false); } };
  return (
    <div className="rounded-[8px] border border-[#E8ECF4] p-3">
      <div className="mb-2 text-[12px] font-semibold text-[#0F1629]">{svc.serviceName} <span className="font-mono text-[10px] text-[#94A3B8]">{svc.serviceCode}</span></div>
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-1">Tier</th><th>Max Daily Txn</th><th>Hours/Day</th><th></th></tr></thead>
        <tbody>
          {tiers.map((t, i) => (
            <tr key={i} className="border-b border-[#E8ECF4]">
              <td className="py-1.5">Tier {i + 1}</td>
              <td><Input className="h-[26px] w-24" type="number" value={t.maxTxnVolume} onChange={(e) => setTiers((arr) => arr.map((x, j) => j === i ? { ...x, maxTxnVolume: Number(e.target.value) } : x))} /></td>
              <td><Input className="h-[26px] w-24" type="number" step="0.01" value={t.hoursPerDay} onChange={(e) => setTiers((arr) => arr.map((x, j) => j === i ? { ...x, hoursPerDay: Number(e.target.value) } : x))} /></td>
              <td className="text-right">{tiers.length > 1 && <Button size="sm" variant="ghost" onClick={() => setTiers((arr) => arr.filter((_, j) => j !== i))}><Trash2 size={12} /></Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div><Label>Effective From</Label><Input className="h-[28px] w-40" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></div>
        <Button size="sm" variant="secondary" onClick={() => setTiers((a) => [...a, { maxTxnVolume: 0, hoursPerDay: 0 }])}><Plus size={13} /> Add Tier</Button>
        <Button size="sm" onClick={save} disabled={busy}>Save</Button>
      </div>
    </div>
  );
}

type TypedCategory = { id: string; name: string; type: string; isBuiltIn: boolean; usedIn: number };

function CategoriesSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1.5 text-[13px] font-bold text-[#0F1629]">Department Categories</h3>
        <CategoryGroup type="DEPARTMENT" usedLabel="Departments Using" />
      </div>
      <div>
        <h3 className="mb-1.5 text-[13px] font-bold text-[#0F1629]">Expense Categories</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          <CategoryGroup type="EXPENSE_INR" title="INR Expenses" usedLabel="Expenses" />
          <CategoryGroup type="EXPENSE_USD" title="USD Expenses" usedLabel="Expenses" />
        </div>
      </div>
      <div>
        <h3 className="mb-1.5 text-[13px] font-bold text-[#0F1629]">Revenue Categories</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          <CategoryGroup type="REVENUE_PRODUCT" title="Revenue Type — Product" usedLabel="Used" />
          <CategoryGroup type="REVENUE_SERVICE" title="Revenue Type — Service" usedLabel="Used" />
        </div>
      </div>
      <div>
        <h3 className="mb-1.5 text-[13px] font-bold text-[#0F1629]">Asset Categories</h3>
        <CategoryGroup type="ASSET" usedLabel="Assets" />
      </div>
    </div>
  );
}

function CategoryGroup({ type, title, usedLabel }: { type: string; title?: string; usedLabel: string }) {
  const { data, mutate } = useSWR<{ data: TypedCategory[] }>(`/api/settings/categories?type=${type}`, apiGet);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const add = async () => { setSaving(true); try { await apiSend("/api/settings/categories", "POST", { name, type }); toast("Category added"); setName(""); setOpen(false); mutate(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } finally { setSaving(false); } };
  const del = async (id: string) => { try { await apiSend(`/api/settings/categories/${id}`, "DELETE"); toast("Category removed"); mutate(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); } };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <SectionTitle>{title ?? "Categories"}</SectionTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} /> Add Category</Button>
      </div>
      <table className="mt-2 w-full text-[12px]">
        <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Category Name</th><th>{usedLabel}</th><th></th></tr></thead>
        <tbody>
          {(data?.data ?? []).length === 0 && <tr><td colSpan={3} className="py-3 text-center text-[#94A3B8]">No categories.</td></tr>}
          {data?.data.map((c) => (
            <tr key={c.id} className="border-b border-[#E8ECF4]">
              <td className="py-2 font-medium">{c.name}{c.isBuiltIn && <Lock size={11} className="ml-1.5 inline text-[#94A3B8]" />}</td>
              <td>{c.usedIn}</td>
              <td className="py-1 text-right">{!c.isBuiltIn && c.usedIn === 0 && <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 size={12} /></Button>}</td>
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
