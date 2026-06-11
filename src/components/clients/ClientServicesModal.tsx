"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PackageBlock, type Block, type PackageType } from "@/components/clients/PackageBlock";
import { useReference } from "@/hooks/useReference";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";
import { formatUsd } from "@/lib/utils";

type ClientService = { serviceId: string; packageType: string; monthlyFeeUsd: number; discountMode: string; discountPct: number };

export function ClientServicesModal({
  open,
  onOpenChange,
  clientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string | null;
  onSaved: () => void;
}) {
  const { data: ref } = useReference();
  const services = ref?.services ?? [];
  const [blocks, setBlocks] = React.useState<Block[]>([]);
  const [totalDiscount, setTotalDiscount] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const feeFor = (serviceId: string, pkg: PackageType): number =>
    services.find((s) => s.id === serviceId)?.packages.find((p) => p.packageType === pkg)?.monthlyFeeUsd ?? 0;

  React.useEffect(() => {
    if (!open || !clientId) return;
    (async () => {
      const res = await apiGet<{ data: ClientService[] }>(`/api/clients/${clientId}/services`);
      const byPkg: Record<string, Block> = {};
      for (const cs of res.data) {
        const pkg = cs.packageType as PackageType;
        if (!byPkg[pkg]) byPkg[pkg] = { packageType: pkg, mode: (cs.discountMode as Block["mode"]) ?? "PER_PACKAGE", blockDiscount: cs.discountPct, entries: {} };
        byPkg[pkg].entries[cs.serviceId] = { selected: true, fee: cs.monthlyFeeUsd, discountPct: cs.discountPct };
      }
      setBlocks(Object.values(byPkg));
      const totalMode = res.data.find((s) => s.discountMode === "TOTAL");
      setTotalDiscount(totalMode?.discountPct ?? 0);
    })();
  }, [open, clientId]);

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

  const blockSubtotal = (blk: Block) => Object.values(blk.entries).filter((e) => e.selected).reduce((s, e) => s + e.fee, 0);
  const grossTotal = blocks.reduce((s, b) => s + blockSubtotal(b), 0);

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const payload = blocks.flatMap((blk) =>
        Object.entries(blk.entries).filter(([, e]) => e.selected).map(([serviceId, e]) => ({
          serviceId, packageType: blk.packageType, monthlyFeeUsd: e.fee,
          discountMode: blk.mode,
          discountPct: blk.mode === "PER_SERVICE" ? e.discountPct : blk.mode === "PER_PACKAGE" ? blk.blockDiscount : totalDiscount,
        }))
      );
      await apiSend(`/api/clients/${clientId}/services`, "PUT", { services: payload });
      toast("Services updated");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit Services" width={640}>
        <DialogBody>
          <div className="space-y-4">
            {blocks.map((blk, i) => (
              <PackageBlock key={i} id={i} block={blk} services={services} feeFor={feeFor}
                onPatch={(patch) => patchBlock(i, patch)} onToggleService={(sid) => toggleSvc(i, sid)}
                onRemove={() => removeBlock(i)} subtotal={blockSubtotal(blk)} />
            ))}
            <Button variant="secondary" onClick={addBlock}><Plus size={14} /> Add Package Block</Button>
            {blocks.some((b) => b.mode === "TOTAL") && (
              <div className="flex items-center gap-2"><Label className="mb-0">Total Discount %</Label><Input className="h-[28px] w-20" type="number" value={totalDiscount} onChange={(e) => setTotalDiscount(Number(e.target.value))} /></div>
            )}
            <div className="rounded-[10px] bg-[#F8F9FC] p-3 text-[13px]">
              <div className="flex justify-between"><span className="text-[#64748B]">Total Monthly Fee</span><span className="font-semibold">{formatUsd(grossTotal)}</span></div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Services"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
