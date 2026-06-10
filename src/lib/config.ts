import { prisma } from "@/lib/prisma";
import { DEFAULT_SYSTEM_CONFIG, type SystemConfigValues } from "@/lib/engines/types";
import { effectiveRates } from "@/lib/engines/currencyEngine";

/**
 * Load all SystemConfig rows and merge them over the documented defaults.
 * Values are stored as JSON scalars (numbers).
 */
export async function getSystemConfig(): Promise<SystemConfigValues> {
  const rows = await prisma.systemConfig.findMany();
  const merged: SystemConfigValues = { ...DEFAULT_SYSTEM_CONFIG };
  for (const row of rows) {
    const key = row.configKey as keyof SystemConfigValues;
    if (key in merged && typeof row.configValue === "number") {
      merged[key] = row.configValue as number;
    }
  }
  return merged;
}

/** Derived rates A/B/C/D from a config object. */
export function ratesFromConfig(config: SystemConfigValues) {
  return effectiveRates({
    fixedRate: config.usd_inr_fixed_rate,
    marketRate: config.usd_inr_market_rate,
    markupB: config.expense_markup_b,
    skydoMarkup: config.skydo_markup,
    markupD: config.expense_markup_d,
  });
}
