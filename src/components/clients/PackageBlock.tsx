"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { formatUsd } from "@/lib/utils";

export type PackageType = "LESS_THAN_25" | "MORE_THAN_25";
export type DiscountMode = "PER_SERVICE" | "PER_PACKAGE" | "TOTAL";
export interface SvcEntry { selected: boolean; fee: number; discountPct: number }
export interface Block { packageType: PackageType; mode: DiscountMode; blockDiscount: number; entries: Record<string, SvcEntry> }

export interface ServiceOption {
  id: string;
  code: string;
  name: string;
  packages: { packageType: string; monthlyFeeUsd: number }[];
}

/** A single package block within the Add Client wizard's step 3. */
export function PackageBlock({
  id,
  block,
  services,
  feeFor,
  onPatch,
  onToggleService,
  onRemove,
  subtotal,
}: {
  id: number;
  block: Block;
  services: ServiceOption[];
  feeFor: (serviceId: string, pkg: PackageType) => number;
  onPatch: (patch: Partial<Block>) => void;
  onToggleService: (serviceId: string) => void;
  onRemove: () => void;
  subtotal: number;
}) {
  return (
    <div className="rounded-[10px] border border-[#E8ECF4] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="mb-0">Package Type</Label>
          <Select
            className="w-44"
            value={block.packageType}
            onChange={(e) => {
              const pkg = e.target.value as PackageType;
              const entries = Object.fromEntries(
                Object.entries(block.entries).map(([sid, en]) => [sid, { ...en, fee: feeFor(sid, pkg) }])
              );
              onPatch({ packageType: pkg, entries });
            }}
          >
            <option value="LESS_THAN_25">Less than 25 Routes</option>
            <option value="MORE_THAN_25">More than 25 Routes</option>
          </Select>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 size={13} /></Button>
      </div>

      {/* Column headers */}
      <div className="mt-3 flex items-center gap-2 border-b border-[#E8ECF4] pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
        <span className="w-4" />
        <span className="w-16">Service</span>
        <span className="flex-1">Name</span>
        <span className="w-24 text-right">Monthly Fee ($)</span>
        <span className="w-16 text-right">Disc %</span>
        <span className="w-24 text-right">Discounted Fee ($)</span>
      </div>

      <div className="mt-1.5 space-y-1.5">
        {services.map((svc) => {
          const en = block.entries[svc.id];
          // Effective discount for this row depends on the block's discount mode.
          const effDisc = block.mode === "PER_SERVICE" ? (en?.discountPct ?? 0) : block.mode === "PER_PACKAGE" ? block.blockDiscount : 0;
          const discountedFee = (en?.fee ?? 0) * (1 - effDisc / 100);
          return (
            <div key={svc.id} className="flex items-center gap-2 text-[12px]">
              <Checkbox checked={!!en?.selected} onChange={() => onToggleService(svc.id)} />
              <span className="w-16 font-mono text-[11px]">{svc.code}</span>
              <span className="flex-1 text-[#64748B]">{svc.name}</span>
              {en?.selected ? (
                <>
                  <Input className="h-[28px] w-24" type="number" value={en.fee} onChange={(e) => onPatch({ entries: { ...block.entries, [svc.id]: { ...en, fee: Number(e.target.value) } } })} />
                  {block.mode === "PER_SERVICE" ? (
                    <Input className="h-[28px] w-16" type="number" placeholder="%" value={en.discountPct} onChange={(e) => onPatch({ entries: { ...block.entries, [svc.id]: { ...en, discountPct: Number(e.target.value) } } })} />
                  ) : (
                    <span className="w-16 text-right text-[#94A3B8]">{effDisc}%</span>
                  )}
                  <span className="w-24 text-right font-medium tabular-nums text-[#0F1629]">{formatUsd(discountedFee)}</span>
                </>
              ) : (
                <><span className="w-24" /><span className="w-16" /><span className="w-24" /></>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
          {(["PER_SERVICE", "PER_PACKAGE", "TOTAL"] as DiscountMode[]).map((m) => (
            <label key={m} className="flex items-center gap-1">
              <input type="radio" name={`mode-${id}`} checked={block.mode === m} onChange={() => onPatch({ mode: m })} className="accent-[#3266AD]" />
              {m === "PER_SERVICE" ? "Per Service" : m === "PER_PACKAGE" ? "Per Package" : "Total"}
            </label>
          ))}
        </div>
        {block.mode === "PER_PACKAGE" && (
          <div className="flex items-center gap-1"><span className="text-[11px] text-[#64748B]">Discount %</span><Input className="h-[28px] w-16" type="number" value={block.blockDiscount} onChange={(e) => onPatch({ blockDiscount: Number(e.target.value) })} /></div>
        )}
        <span className="ml-auto text-[12px] font-semibold">Subtotal: {formatUsd(subtotal)}</span>
      </div>
    </div>
  );
}
