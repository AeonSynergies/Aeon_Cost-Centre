import { describe, it, expect } from "vitest";
import {
  calculateResourceRevenueShare,
  calculateDeptRevenueShare,
} from "./revenueShareEngine";

describe("revenueShareEngine", () => {
  it("splits 50% of service revenue across billable resources", () => {
    expect(
      calculateResourceRevenueShare({
        serviceNetRevenueInr: 100000,
        billableResourceCount: 5,
      })
    ).toBe(10000);
  });

  it("returns 0 when there are no billable resources", () => {
    expect(
      calculateResourceRevenueShare({
        serviceNetRevenueInr: 100000,
        billableResourceCount: 0,
      })
    ).toBe(0);
  });

  it("department share is 50% of department revenue", () => {
    expect(calculateDeptRevenueShare(100000)).toBe(50000);
  });
});
