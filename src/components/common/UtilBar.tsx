"use client";

export function UtilBar({ pct }: { pct: number }) {
  const color = pct > 100 || pct < 40 ? "#D85A30" : pct >= 80 ? "#1D9E75" : "#BA7517";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div style={{ width: `${Math.min(100, pct)}%`, background: color }} className="h-full" />
      </div>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
