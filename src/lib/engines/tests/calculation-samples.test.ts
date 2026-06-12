import { describe, it, expect } from "vitest";
import { calculateRevenueWaterfall } from "@/lib/engines/feeEngine";
import { prorateClientFee, prorateClientFeeWithRevisions, prorateResourceSalary } from "@/lib/engines/prorateEngine";
import { calculateFullyLoadedCost } from "@/lib/engines/costEngine";
import { calculateResourceRevenueShare } from "@/lib/engines/revenueShareEngine";
import { getServiceHours, getInvoiceHours, calculateUtilisation, DEFAULT_UTIL_TIERS } from "@/lib/engines/utilisationEngine";
import {
  sample1, sample2, sample3_proration, sample4_salary, sample5_revision,
  sample6_termination, sample8_cost, sample9_revenueShare, sample10_clientTermination,
  sample11_clientFeeRevision,
} from "./calculation-samples";

const inv = (routesRan: number, fleet: boolean, marsh: boolean) =>
  getInvoiceHours({ routesRan, fleetInvoice: fleet, marshInvoice: marsh, routeThreshold: 50, belowThresholdHrs: 1.0, aboveThresholdHrs: 1.5, fleetAddOn: 0.5, marshAddOn: 0.5 });

describe("calculation samples", () => {
  it("sample 1 — Card, 20% discount waterfall", () => {
    const w = calculateRevenueWaterfall(sample1.input);
    const e = sample1.expected;
    expect(w.discountUsd).toBeCloseTo(e.discountUsd, 2);
    expect(w.discountedFeeUsd).toBeCloseTo(e.discountedFeeUsd, 2);
    expect(w.txnFeeUsd).toBeCloseTo(e.txnFeeUsd, 2);
    expect(w.netServiceCostUsd).toBeCloseTo(e.netServiceCostUsd, 2);
    expect(w.stripeFeeUsd).toBeCloseTo(e.stripeFeeUsd, 2);
    expect(w.grossRevenueUsd).toBeCloseTo(e.grossRevenueUsd, 2);
    expect(w.abbieRoyaltyUsd).toBeCloseTo(e.abbieRoyaltyUsd, 2);
    expect(w.reserveFundUsd).toBeCloseTo(e.reserveFundUsd, 2);
    expect(w.netRevenueUsd).toBeCloseTo(e.netRevenueUsd, 2);
    expect(w.skydoFeeUsd).toBeCloseTo(e.skydoFeeUsd, 2);
    expect(w.netUsdToConvert).toBeCloseTo(e.netUsdToConvert, 2);
    expect(w.netRevenueInr).toBeCloseTo(e.netRevenueInr, 1);
  });

  it("sample 2 — ACH, no discount waterfall", () => {
    const w = calculateRevenueWaterfall(sample2.input);
    const e = sample2.expected;
    expect(w.txnFeeUsd).toBeCloseTo(e.txnFeeUsd, 2);
    expect(w.netServiceCostUsd).toBeCloseTo(e.netServiceCostUsd, 2);
    expect(w.stripeFeeUsd).toBeCloseTo(e.stripeFeeUsd, 2);
    expect(w.grossRevenueUsd).toBeCloseTo(e.grossRevenueUsd, 2);
    expect(w.netRevenueUsd).toBeCloseTo(e.netRevenueUsd, 2);
    expect(w.netRevenueInr).toBeCloseTo(e.netRevenueInr, 1);
  });

  it("sample 3 — mid-month client start proration (1330)", () => {
    expect(prorateClientFee(sample3_proration.input)).toBeCloseTo(sample3_proration.expected.proratedFee, 2);
  });

  it("sample 4 — mid-month resource join salary (20000)", () => {
    expect(prorateResourceSalary(sample4_salary.input)).toBeCloseTo(sample4_salary.expected.proratedSalary, 2);
  });

  it("sample 5 — mid-month salary revision (31875)", () => {
    expect(prorateResourceSalary(sample5_revision.input)).toBeCloseTo(sample5_revision.expected.total, 2);
  });

  it("sample 6 — resource terminated mid-month (19354.84)", () => {
    expect(prorateResourceSalary(sample6_termination.input)).toBeCloseTo(sample6_termination.expected.proratedSalary, 2);
  });

  it("sample 7 — utilisation per service tier + invoice rules", () => {
    // Harmony: txn 35 -> 0.45; routes 25 (<50) -> 1.0 + fleet 0.5 = 1.5; adoc 0.5
    expect(getServiceHours(35, DEFAULT_UTIL_TIERS)).toBe(0.45);
    expect(inv(25, true, false)).toBeCloseTo(1.5, 6);
    const harmonyTotal = 0.45 + 1.5 + 0.5;
    expect(harmonyTotal).toBeCloseTo(2.45, 6);
    // Semper: txn 0 -> 0; routes 50 (>=50) -> 1.5 + fleet 0.5 + marsh 0.5 = 2.5; adoc 0.5
    expect(getServiceHours(0, DEFAULT_UTIL_TIERS)).toBe(0);
    expect(inv(50, true, true)).toBeCloseTo(2.5, 6);
    const semperTotal = 0 + 2.5 + 0.5;
    expect(semperTotal).toBeCloseTo(3.0, 6);
    // Resource total
    const r = calculateUtilisation({ serviceHoursPerDay: 0.45 + 0, invoiceHoursPerDay: 1.5 + 2.5, adocHoursPerDay: 0.5 + 0.5, availableHoursPerDay: 8, workingDaysPerMonth: 22 });
    expect(r.totalHoursPerDay).toBeCloseTo(5.45, 6);
    expect(r.utilisationPct).toBeCloseTo(68.125, 3);
    expect(r.monthlyHours).toBeCloseTo(119.9, 1);
    expect(r.capacityStatus).toBe("UNDER_UTILISED");
  });

  it("sample 8 — fully-loaded cost breakdown", () => {
    const c = calculateFullyLoadedCost(sample8_cost.input);
    const e = sample8_cost.expected;
    expect(c.overhead).toBeCloseTo(e.overhead, 2);
    expect(c.laptopAmortised).toBeCloseTo(e.laptopAmortised, 2);
    expect(c.ms365Cost).toBeCloseTo(e.ms365Cost, 2);
    expect(c.totalCostInr).toBeCloseTo(e.totalCostInr, 2);
    expect(c.totalCostUsd).toBeCloseTo(e.totalCostUsd, 2);
  });

  it("sample 9 — revenue share split across billable resources", () => {
    expect(calculateResourceRevenueShare(sample9_revenueShare.input)).toBeCloseTo(sample9_revenueShare.expected.perResourceShare, 2);
  });

  it("sample 10 — mid-month client termination proration (919.35)", () => {
    expect(prorateClientFee(sample10_clientTermination.input)).toBeCloseTo(sample10_clientTermination.expected.proratedFee, 2);
  });

  it("sample 11 — mid-month client fee revision proration (254.84)", () => {
    expect(prorateClientFeeWithRevisions(sample11_clientFeeRevision.input)).toBeCloseTo(sample11_clientFeeRevision.expected.proratedFee, 2);
  });
});
