/**
 * Calculation verification samples (Part H).
 * Each sample documents an engine input and its expected output. These are
 * asserted in calculation-samples.test.ts.
 *
 * NOTE: the brief's Sample 5 listed part2 = 25000 / total = 39375, but
 * 35000 × 14/28 = 17500, so the correct total is 31875. We use the
 * mathematically-correct values here.
 */
import { DEFAULT_SYSTEM_CONFIG, type SystemConfigValues } from "@/lib/engines/types";

const cfg: SystemConfigValues = { ...DEFAULT_SYSTEM_CONFIG };

export const sample1 = {
  input: { totalServiceCostUsd: 1900, paymentMethod: "CARD" as const, discountPct: 20, proratedFeeUsd: 1900, config: cfg },
  expected: {
    discountUsd: 380, discountedFeeUsd: 1520, txnFeeUsd: 60.8, netServiceCostUsd: 1580.8,
    stripeFeeUsd: 39.82, grossRevenueUsd: 1540.98, abbieRoyaltyUsd: 154.098, reserveFundUsd: 231.147,
    netRevenueUsd: 1155.735, skydoFeeUsd: 23.1147, netUsdToConvert: 1132.6203, netRevenueInr: 103068.45,
  },
};

export const sample2 = {
  // ACH stripe fee is capped at $5: 2030 × 0.8% = 16.24 -> capped to $5.
  input: { totalServiceCostUsd: 2000, paymentMethod: "ACH" as const, discountPct: 0, proratedFeeUsd: 2000, config: cfg },
  expected: {
    discountUsd: 0, discountedFeeUsd: 2000, txnFeeUsd: 30, netServiceCostUsd: 2030,
    stripeFeeUsd: 5, grossRevenueUsd: 2025, netRevenueUsd: 1518.75, netRevenueInr: 1488.375 * 91,
  },
};

export const sample3_proration = {
  input: { monthlyFee: 1900, billingType: "LEGACY" as const, startDate: new Date(2025, 10, 10), endDate: null, periodYear: 2025, periodMonth: 11 },
  expected: { proratedFee: (1900 * 21) / 30 }, // 1330
};

export const sample4_salary = {
  input: { revisions: [{ effectiveFrom: new Date(2025, 10, 11), baseSalary: 30000 }], joinedDate: new Date(2025, 10, 11), terminatedDate: null, periodYear: 2025, periodMonth: 11 },
  expected: { proratedSalary: 20000 }, // 30000 × 20/30
};

export const sample5_revision = {
  input: {
    revisions: [
      { effectiveFrom: new Date(2025, 10, 25), baseSalary: 28750 },
      { effectiveFrom: new Date(2026, 1, 15), baseSalary: 35000 },
    ],
    joinedDate: new Date(2025, 10, 25), terminatedDate: null, periodYear: 2026, periodMonth: 2,
  },
  expected: { total: 28750 * (14 / 28) + 35000 * (14 / 28) }, // 14375 + 17500 = 31875
};

export const sample6_termination = {
  input: { revisions: [{ effectiveFrom: new Date(2025, 10, 11), baseSalary: 30000 }], joinedDate: new Date(2025, 10, 11), terminatedDate: new Date(2026, 4, 20), periodYear: 2026, periodMonth: 5 },
  expected: { proratedSalary: (30000 * 20) / 31 }, // 19354.84
};

export const sample8_cost = {
  input: { baseSalary: 30000, incentive: 0, allowance: 0, overheadManual: null, overheadPct: 10, laptopCostInr: 19400, amortisationMonths: 36, ms365RateInr: 900, zoomRateUsd: 0, rateB: 86, rateD: 80 },
  expected: { overhead: 3000, laptopAmortised: 19400 / 36, ms365Cost: 900, totalCostInr: 30000 + 3000 + 19400 / 36 + 900, totalCostUsd: (30000 + 3000 + 19400 / 36 + 900) / 80 },
};

export const sample9_revenueShare = {
  input: { serviceNetRevenueInr: 101283, billableResourceCount: 2 },
  expected: { perResourceShare: (101283 * 0.5) / 2 }, // 25320.75
};

export const sample10_clientTermination = {
  input: { monthlyFee: 1900, billingType: "LEGACY" as const, startDate: new Date(2025, 10, 10), endDate: new Date(2026, 4, 15), periodYear: 2026, periodMonth: 5 },
  expected: { proratedFee: (1900 * 15) / 31 }, // 919.35
};

export const sample11_clientFeeRevision = {
  // Fee $200 from Jan 1, revised to $300 from May 15. May 2026 has 31 days.
  // May 1-14 (14d) @ $200 -> 200×14/31 = 90.32 ; May 15-31 (17d) @ $300 -> 300×17/31 = 164.52
  input: {
    revisions: [
      { monthlyFeeUsd: 200, effectiveFrom: new Date(2026, 0, 1) },
      { monthlyFeeUsd: 300, effectiveFrom: new Date(2026, 4, 15) },
    ],
    startDate: new Date(2026, 0, 1), endDate: null, periodYear: 2026, periodMonth: 5, billingType: "LEGACY" as const,
  },
  expected: { proratedFee: (200 * 14) / 31 + (300 * 17) / 31 }, // 254.84
};
