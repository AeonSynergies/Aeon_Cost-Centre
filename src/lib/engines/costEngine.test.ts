import { describe, it, expect } from "vitest";
import { calculateFullyLoadedCost } from "./costEngine";

describe("costEngine - fully loaded cost", () => {
  it("auto-computes overhead at the configured percentage", () => {
    const r = calculateFullyLoadedCost({
      baseSalary: 20000,
      incentive: 0,
      allowance: 0,
      overheadManual: null,
      overheadPct: 10,
      laptopCostInr: null,
      amortisationMonths: 36,
      ms365RateInr: 900,
      zoomRateUsd: 0,
      rateB: 86,
      rateD: 80,
    });
    expect(r.overhead).toBe(2000);
    expect(r.laptopAmortised).toBe(0);
    expect(r.ms365Cost).toBe(900);
    expect(r.zoomCost).toBe(0);
    expect(r.totalCostInr).toBe(22900);
    expect(r.totalCostUsd).toBeCloseTo(286.25, 6);
  });

  it("amortises laptop cost and converts Zoom seats at Rate B", () => {
    const r = calculateFullyLoadedCost({
      baseSalary: 30000,
      incentive: 1000,
      allowance: 500,
      overheadManual: null,
      overheadPct: 10,
      laptopCostInr: 90000,
      amortisationMonths: 36,
      ms365RateInr: 900,
      zoomRateUsd: 16.5,
      rateB: 86,
      rateD: 80,
    });
    expect(r.overhead).toBe(3000);
    expect(r.laptopAmortised).toBe(2500);
    expect(r.zoomCost).toBeCloseTo(1419, 6); // 16.5 * 86
    // 30000 + 1000 + 500 + 3000 + 2500 + 900 + 1419
    expect(r.totalCostInr).toBeCloseTo(39319, 6);
    expect(r.totalCostUsd).toBeCloseTo(39319 / 80, 6);
  });

  it("uses a manual overhead override when provided", () => {
    const r = calculateFullyLoadedCost({
      baseSalary: 50000,
      incentive: 0,
      allowance: 0,
      overheadManual: 1234,
      overheadPct: 10,
      laptopCostInr: null,
      amortisationMonths: 36,
      ms365RateInr: 0,
      zoomRateUsd: 0,
      rateB: 86,
      rateD: 80,
    });
    expect(r.overhead).toBe(1234);
    expect(r.totalCostInr).toBe(51234);
  });
});
