import { describe, it, expect } from "vitest";
import {
  calculateAllocation,
  validateAllocationPcts,
} from "./allocationEngine";

describe("allocationEngine", () => {
  it("validates percentages summing to 100", () => {
    expect(
      validateAllocationPcts({
        deptReservePct: 50,
        businessDevPct: 30,
        productDevPct: 20,
        profitPct: 0,
      })
    ).toBe(true);
    expect(
      validateAllocationPcts({
        deptReservePct: 50,
        businessDevPct: 30,
        productDevPct: 30,
        profitPct: 0,
      })
    ).toBe(false);
  });

  it("allocates with the 2026 split (50/30/20/0)", () => {
    expect(
      calculateAllocation({
        netRevenueInr: 1_000_000,
        deptReservePct: 50,
        businessDevPct: 30,
        productDevPct: 20,
        profitPct: 0,
      })
    ).toEqual({
      deptReserveInr: 500_000,
      businessDevInr: 300_000,
      productDevInr: 200_000,
      profitInr: 0,
    });
  });

  it("allocates with the 2027 split (40/25/15/20)", () => {
    expect(
      calculateAllocation({
        netRevenueInr: 1_000_000,
        deptReservePct: 40,
        businessDevPct: 25,
        productDevPct: 15,
        profitPct: 20,
      })
    ).toEqual({
      deptReserveInr: 400_000,
      businessDevInr: 250_000,
      productDevInr: 150_000,
      profitInr: 200_000,
    });
  });

  it("throws when percentages do not sum to 100", () => {
    expect(() =>
      calculateAllocation({
        netRevenueInr: 1000,
        deptReservePct: 10,
        businessDevPct: 10,
        productDevPct: 10,
        profitPct: 10,
      })
    ).toThrow(/sum to 100/);
  });
});
