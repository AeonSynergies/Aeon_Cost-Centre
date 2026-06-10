/**
 * utilisationEngine — service hours (formerly "BK hours"), invoice hours,
 * and overall capacity utilisation.
 */

export type UtilTier = { maxTxn: number; hoursPerDay: number };

export type CapacityStatus =
  | "HEALTHY"
  | "UNDER_UTILISED"
  | "SEVERELY_UNDER"
  | "OVER_CAPACITY";

/** Default tiers (configurable in Settings). */
export const DEFAULT_UTIL_TIERS: UtilTier[] = [
  { maxTxn: 10, hoursPerDay: 0.1 },
  { maxTxn: 15, hoursPerDay: 0.15 },
  { maxTxn: 30, hoursPerDay: 0.25 },
  { maxTxn: 50, hoursPerDay: 0.45 },
];

/**
 * Service hours per day derived from daily transaction volume.
 * Tiers are matched in ascending maxTxn order; the first tier whose maxTxn
 * is >= the volume applies. Volumes above the top tier use the top tier's hours.
 */
export function getServiceHours(
  dailyTxnVolume: number,
  tiers: UtilTier[] = DEFAULT_UTIL_TIERS
): number {
  if (dailyTxnVolume <= 0) return 0;
  const sorted = [...tiers].sort((a, b) => a.maxTxn - b.maxTxn);
  for (const tier of sorted) {
    if (dailyTxnVolume <= tier.maxTxn) return tier.hoursPerDay;
  }
  return sorted[sorted.length - 1]?.hoursPerDay ?? 0;
}

/**
 * Invoice hours per day from routes ran plus optional fleet/marsh add-ons.
 * Base hours depend on whether routes meet the threshold; add-ons apply only
 * when at least one route was run.
 */
export function getInvoiceHours(params: {
  routesRan: number;
  fleetInvoice: boolean;
  marshInvoice: boolean;
  routeThreshold: number;
  belowThresholdHrs: number;
  aboveThresholdHrs: number;
  fleetAddOn: number;
  marshAddOn: number;
}): number {
  const {
    routesRan,
    fleetInvoice,
    marshInvoice,
    routeThreshold,
    belowThresholdHrs,
    aboveThresholdHrs,
    fleetAddOn,
    marshAddOn,
  } = params;

  if (routesRan <= 0) return 0;

  let hours = routesRan > routeThreshold ? aboveThresholdHrs : belowThresholdHrs;
  if (fleetInvoice) hours += fleetAddOn;
  if (marshInvoice) hours += marshAddOn;
  return hours;
}

/**
 * Overall daily/monthly utilisation and capacity status.
 *
 * Capacity thresholds:
 *   > 100%    -> OVER_CAPACITY
 *   >= 80%    -> HEALTHY
 *   40-79%    -> UNDER_UTILISED
 *   < 40%     -> SEVERELY_UNDER
 */
export function calculateUtilisation(params: {
  serviceHoursPerDay: number;
  invoiceHoursPerDay: number;
  adocHoursPerDay: number;
  availableHoursPerDay?: number;
  workingDaysPerMonth?: number;
}): {
  totalHoursPerDay: number;
  utilisationPct: number;
  monthlyHours: number;
  capacityStatus: CapacityStatus;
} {
  const available = params.availableHoursPerDay ?? 8;
  const workingDays = params.workingDaysPerMonth ?? 22;

  const totalHoursPerDay =
    params.serviceHoursPerDay + params.invoiceHoursPerDay + params.adocHoursPerDay;

  const utilisationPct =
    available > 0 ? (totalHoursPerDay / available) * 100 : 0;
  const monthlyHours = totalHoursPerDay * workingDays;

  let capacityStatus: CapacityStatus;
  if (utilisationPct > 100) capacityStatus = "OVER_CAPACITY";
  else if (utilisationPct >= 80) capacityStatus = "HEALTHY";
  else if (utilisationPct >= 40) capacityStatus = "UNDER_UTILISED";
  else capacityStatus = "SEVERELY_UNDER";

  return { totalHoursPerDay, utilisationPct, monthlyHours, capacityStatus };
}
