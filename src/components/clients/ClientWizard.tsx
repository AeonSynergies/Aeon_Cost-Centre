"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useReference } from "@/hooks/useReference";
import { PackageBlock, type Block, type PackageType } from "@/components/clients/PackageBlock";
import { apiSend } from "@/lib/api-client";
import { formatUsd, cn } from "@/lib/utils";

const DRIVER_BANDS = ["0-49", "50-99", "100-149", "150-199", "200-250", "250+"];
const VAN_BANDS = ["0-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71-80", "81-90", "91-100", "100+"];

/** 3-step Add Client wizard with multi-package blocks. */
export function ClientWizard() {
  const router = useRouter();
  const { data: ref } = useReference();
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [basic, setBasic] = React.useState({ name: "", startDate: "", endDate: "", paymentMethod: "ACH", billingType: "LEGACY", txnFeeEnabled: true });
  const [fleet, setFleet] = React.useState({ driverBand: "", vanBand: "", routeBand: "" });
  const [blocks, setBlocks] = React.useState<Block[]>([]);
  const [totalDiscount, setTotalDiscount] = React.useState(0);

  const services = ref?.services ?? [];

  const feeFor = (serviceId: string, pkg: PackageType): number => {
    const svc = services.find((s) => s.id === serviceId);
    return svc?.packages.find((p) => p.packageType === pkg)?.monthlyFeeUsd ?? 0;
  };

  const addBlock = () => setBlocks((b) => [...b, { packageType: "LESS_THAN_25", mode: "PER_PACKAGE", blockDiscount: 0, entries: {} }]);
  const patchBlock = (i: number, patch: Partial<Block>) => setBlocks((b) => b.map((blk, idx) => (idx === i ? { ...blk, ...patch } : blk)));
  const removeBlock = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));
  const toggleSvc = (i: number, serviceId: string) =>
    setBlocks((b) => b.map((blk, idx) => {
      if (idx !== i) return blk;
      const cur = blk.entries[serviceId];
      const entries = { ...blk.entries };
      if (cur?.selected) delete entries[serviceId];
      else entries[serviceId] = { selected: true, fee: feeFor(serviceId, blk.packageType), discountPct: 0 };
      return { ...blk, entries };
    }));

  const blockSubtotal = (blk: Block) =>
    Object.values(blk.entries).filter((e) => e.selected).reduce((s, e) => s + e.fee, 0);
  const grossTotal = blocks.reduce((s, b) => s + blockSubtotal(b), 0);
  const discountTotal = blocks.reduce((s, blk) =>
    s + Object.entries(blk.entries).filter(([, e]) => e.selected).reduce((ss, [, e]) => {
      const pct = blk.mode === "PER_SERVICE" ? e.discountPct : blk.mode === "PER_PACKAGE" ? blk.blockDiscount : totalDiscount;
      return ss + (e.fee * pct) / 100;
    }, 0), 0);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const svcPayload = blocks.flatMap((blk) =>
        Object.entries(blk.entries).filter(([, e]) => e.selected).map(([serviceId, e]) => ({
          serviceId,
          packageType: blk.packageType,
          monthlyFeeUsd: e.fee,
          discountMode: blk.mode,
          discountPct: blk.mode === "PER_SERVICE" ? e.discountPct : blk.mode === "PER_PACKAGE" ? blk.blockDiscount : totalDiscount,
        }))
      );
      const res = await apiSend<{ data: { id: string } }>("/api/clients", "POST", {
        ...basic,
        endDate: basic.endDate || null,
        driverBand: fleet.driverBand || null,
        vanBand: fleet.vanBand || null,
        routeBand: fleet.routeBand || null,
        services: svcPayload,
      });
      router.push(`/clients/${res.data.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setSaving(false); }
  };

  return (
    <div className="flex-1 overflow-auto p-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}><ArrowLeft size={14} /> Clients</Button>
      <h1 className="mt-2 text-[22px] font-bold text-[#0F1629]">Add Client</h1>

      <div className="mt-3 flex items-center gap-2">
        {["Basic Info", "Fleet Details", "Services & Pricing"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold", step > i + 1 ? "bg-[#1D9E75] text-white" : step === i + 1 ? "bg-[#3266AD] text-white" : "bg-[#F1F5F9] text-[#94A3B8]")}>
              {step > i + 1 ? <Check size={12} /> : i + 1}
            </span>
            <span className={cn("text-[12px]", step === i + 1 ? "font-semibold text-[#0F1629]" : "text-[#94A3B8]")}>{s}</span>
            {i < 2 && <span className="mx-1 h-px w-8 bg-[#E8ECF4]" />}
          </div>
        ))}
      </div>

      {error && <div className="mt-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}

      <Card className="mt-4 max-w-3xl p-5">
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Client Name</Label><Input value={basic.name} onChange={(e) => setBasic((b) => ({ ...b, name: e.target.value }))} /></div>
            <div><Label>Start Date</Label><Input type="date" value={basic.startDate} onChange={(e) => setBasic((b) => ({ ...b, startDate: e.target.value }))} /></div>
            <div><Label>End Date (optional)</Label><Input type="date" value={basic.endDate} onChange={(e) => setBasic((b) => ({ ...b, endDate: e.target.value }))} /></div>
            <div><Label>Payment Method</Label>
              <Select value={basic.paymentMethod} onChange={(e) => setBasic((b) => ({ ...b, paymentMethod: e.target.value }))}>
                <option value="ACH">ACH</option><option value="CARD">Card</option>
              </Select>
            </div>
            <div><Label>Billing Type</Label>
              <Select value={basic.billingType} onChange={(e) => setBasic((b) => ({ ...b, billingType: e.target.value }))}>
                <option value="LEGACY">Legacy</option><option value="NEW">New</option>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-[12px] text-[#0F1629]"><Switch checked={basic.txnFeeEnabled} onCheckedChange={(v) => setBasic((b) => ({ ...b, txnFeeEnabled: v }))} /> Charge Transaction Fee</label>
              <p className="mt-1 text-[11px] text-[#94A3B8]">{basic.txnFeeEnabled ? "Transaction fee will be added to billing." : "No transaction fee charged."}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-3 gap-3">
            <div><Label>No. of Drivers</Label>
              <Select value={fleet.driverBand} onChange={(e) => setFleet((f) => ({ ...f, driverBand: e.target.value }))}>
                <option value="">Select…</option>{DRIVER_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
            <div><Label>No. of Vans</Label>
              <Select value={fleet.vanBand} onChange={(e) => setFleet((f) => ({ ...f, vanBand: e.target.value }))}>
                <option value="">Select…</option>{VAN_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
            <div><Label>Daily Routes</Label>
              <Select value={fleet.routeBand} onChange={(e) => setFleet((f) => ({ ...f, routeBand: e.target.value }))}>
                <option value="">Select…</option>{VAN_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {blocks.map((blk, i) => (
              <PackageBlock
                key={i}
                id={i}
                block={blk}
                services={services}
                feeFor={feeFor}
                onPatch={(patch) => patchBlock(i, patch)}
                onToggleService={(sid) => toggleSvc(i, sid)}
                onRemove={() => removeBlock(i)}
                subtotal={blockSubtotal(blk)}
              />
            ))}

            <Button variant="secondary" onClick={addBlock}><Plus size={14} /> Add Package Block</Button>

            {blocks.some((b) => b.mode === "TOTAL") && (
              <div className="flex items-center gap-2"><Label className="mb-0">Total Discount %</Label><Input className="h-[28px] w-20" type="number" value={totalDiscount} onChange={(e) => setTotalDiscount(Number(e.target.value))} /></div>
            )}

            <div className="rounded-[10px] bg-[#F8F9FC] p-3 text-[13px]">
              <div className="flex justify-between"><span className="text-[#64748B]">Total Monthly Fee</span><span className="font-semibold">{formatUsd(grossTotal)}</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Total Discount</span><span className="font-semibold text-[#D85A30]">−{formatUsd(discountTotal)}</span></div>
              <div className="mt-1 flex justify-between border-t border-[#E8ECF4] pt-1"><span className="font-semibold">Total Payable</span><span className="font-bold">{formatUsd(grossTotal - discountTotal)}</span></div>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-4 flex max-w-3xl justify-between">
        <Button variant="secondary" onClick={() => (step === 1 ? router.push("/clients") : setStep(step - 1))}>{step === 1 ? "Cancel" : "Back"}</Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 && (!basic.name || !basic.startDate)}>Next</Button>
        ) : (
          <Button onClick={submit} disabled={saving || grossTotal === 0}>{saving ? "Creating…" : "Create Client"}</Button>
        )}
      </div>
    </div>
  );
}
