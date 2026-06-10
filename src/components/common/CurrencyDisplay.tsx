import { formatInr, formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Dual-currency cell. Primary value large, secondary smaller + muted below.
 * primary="INR" shows ₹ large with ($) below; primary="USD" shows $ large
 * with (₹) below.
 */
export function Money({
  usd,
  inr,
  primary = "INR",
  className,
  negativeColors = false,
}: {
  usd: number;
  inr: number;
  primary?: "USD" | "INR";
  className?: string;
  negativeColors?: boolean;
}) {
  const primaryVal = primary === "USD" ? formatUsd(usd) : formatInr(inr);
  const secondaryVal = primary === "USD" ? formatInr(inr) : formatUsd(usd);
  const ref = primary === "USD" ? usd : inr;

  const color = negativeColors
    ? ref < 0
      ? "text-[#D85A30]"
      : "text-[#1D9E75]"
    : "text-[#0F1629]";

  return (
    <div className={cn("leading-tight", className)}>
      <div className={cn("text-[13px] font-semibold tabular-nums", color)}>
        {primaryVal}
      </div>
      <div className="text-[11px] tabular-nums text-[#94A3B8]">({secondaryVal})</div>
    </div>
  );
}

/** Alias matching the structure naming. */
export { Money as CurrencyDisplay };
