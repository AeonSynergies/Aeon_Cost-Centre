/**
 * Server-side financial metric helpers shared by API routes and pages.
 * These compose the pure calculation engines with DB-shaped records.
 */
import type { SystemConfigValues } from "@/lib/engines/types";
import { calculateFullyLoadedCost } from "@/lib/engines/costEngine";
import { calculateRevenueWaterfall, type RevenueWaterfall } from "@/lib/engines/feeEngine";
import { prorateClientFee, prorateResourceSalary } from "@/lib/engines/prorateEngine";
import { ratesFromConfig } from "@/lib/config";

export interface Period {
  year: number;
  month: number; // 1-12
}

export function currentPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Is a resource active at the end of the given period? */
export function isResourceActive(
  resource: { joinedDate: Date; terminatedDate: Date | null },
  period: Period
): boolean {
  const periodEnd = new Date(period.year, period.month, 0); // last day of month
  if (resource.joinedDate > periodEnd) return false;
  if (resource.terminatedDate) {
    const periodStart = new Date(period.year, period.month - 1, 1);
    // Treat the 31 Dec 2026 sentinel as open-ended.
    const sentinel = new Date(2026, 11, 31).getTime();
    if (resource.terminatedDate.getTime() !== sentinel && resource.terminatedDate < periodStart) {
      return false;
    }
  }
  return true;
}

type ResourceForCost = {
  joinedDate: Date;
  terminatedDate: Date | null;
  overheadManual: number | null;
  laptopCostInr: number | null;
  revisions: Array<{ effectiveFrom: Date; baseSalary: number; incentive: number; allowance: number }>;
  costCentre: { ms365RateInr: number; zoomRateUsd: number };
};

/** Latest revision whose effectiveFrom is on/before the end of the period. */
function activeRevision<T extends { effectiveFrom: Date }>(
  revisions: T[],
  period: Period
): T | null {
  const periodEnd = new Date(period.year, period.month, 0);
  const eligible = revisions
    .filter((r) => r.effectiveFrom <= periodEnd)
    .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
  return eligible.length ? eligible[eligible.length - 1] : revisions[0] ?? null;
}

export function computeResourceCost(
  resource: ResourceForCost,
  config: SystemConfigValues,
  period: Period
) {
  const rates = ratesFromConfig(config);
  const rev = activeRevision(resource.revisions, period);

  const proratedBase = prorateResourceSalary({
    revisions: resource.revisions.map((r) => ({
      effectiveFrom: r.effectiveFrom,
      baseSalary: r.baseSalary,
    })),
    joinedDate: resource.joinedDate,
    terminatedDate: resource.terminatedDate,
    periodYear: period.year,
    periodMonth: period.month,
  });

  return calculateFullyLoadedCost({
    baseSalary: proratedBase,
    incentive: rev?.incentive ?? 0,
    allowance: rev?.allowance ?? 0,
    overheadManual: resource.overheadManual,
    overheadPct: config.overhead_pct,
    laptopCostInr: resource.laptopCostInr,
    amortisationMonths: config.laptop_amortisation_months,
    ms365RateInr: resource.costCentre.ms365RateInr,
    zoomRateUsd: resource.costCentre.zoomRateUsd,
    rateB: rates.rateB,
    rateD: rates.rateD,
  });
}

type ClientForWaterfall = {
  startDate: Date;
  endDate: Date | null;
  billingType: "LEGACY" | "NEW";
  paymentMethod: "CARD" | "ACH";
  services: Array<{ monthlyFeeUsd: number; discountPct: number }>;
};

/**
 * Aggregate revenue waterfall for a client across all its services for a
 * period. Per-service fees are prorated with the same client dates; the
 * discount is fee-weighted across services.
 */
export function computeClientWaterfall(
  client: ClientForWaterfall,
  config: SystemConfigValues,
  period: Period
): RevenueWaterfall {
  const totalServiceCostUsd = client.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);

  const proratedFeeUsd = client.services.reduce(
    (s, x) =>
      s +
      prorateClientFee({
        monthlyFee: x.monthlyFeeUsd,
        billingType: client.billingType,
        startDate: client.startDate,
        endDate: client.endDate,
        periodYear: period.year,
        periodMonth: period.month,
      }),
    0
  );

  const discountPct =
    totalServiceCostUsd > 0
      ? client.services.reduce((s, x) => s + x.monthlyFeeUsd * x.discountPct, 0) /
        totalServiceCostUsd
      : 0;

  return calculateRevenueWaterfall({
    totalServiceCostUsd,
    proratedFeeUsd,
    discountPct,
    paymentMethod: client.paymentMethod,
    config,
  });
}

type ClientWithServiceIds = ClientForWaterfall & {
  services: Array<{ serviceId: string; monthlyFeeUsd: number; discountPct: number }>;
};

/**
 * Attribute each client's net revenue (INR) to its services pro-rata by fee,
 * and roll up to a per-service total across all clients for the period.
 */
export function perServiceNetRevenueInr(
  clients: ClientWithServiceIds[],
  config: SystemConfigValues,
  period: Period
): Map<string, number> {
  const byService = new Map<string, number>();
  for (const client of clients) {
    const total = client.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
    if (total <= 0) continue;
    const wf = computeClientWaterfall(client, config, period);
    for (const svc of client.services) {
      const share = (svc.monthlyFeeUsd / total) * wf.netRevenueInr;
      byService.set(svc.serviceId, (byService.get(svc.serviceId) ?? 0) + share);
    }
  }
  return byService;
}
