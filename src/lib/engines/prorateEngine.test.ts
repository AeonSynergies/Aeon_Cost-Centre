import { describe, it, expect } from "vitest";
import { prorateClientFee, prorateResourceSalary } from "./prorateEngine";

describe("prorateEngine - client fee", () => {
  it("prorates the first partial month day-accurately for LEGACY too", () => {
    // 10 Nov 2025 -> 30 Nov = 21 active days of 30 (proration applies to all types now).
    expect(
      prorateClientFee({
        monthlyFee: 300,
        billingType: "LEGACY",
        startDate: new Date(2025, 10, 10), // 10 Nov 2025
        endDate: null,
        periodYear: 2025,
        periodMonth: 11,
      })
    ).toBeCloseTo((300 * 21) / 30, 6);
  });

  it("NEW prorates the first partial month by days active", () => {
    // 10 Nov 2025 -> 30 Nov = 21 active days of 30.
    expect(
      prorateClientFee({
        monthlyFee: 300,
        billingType: "NEW",
        startDate: new Date(2025, 10, 10),
        endDate: null,
        periodYear: 2025,
        periodMonth: 11,
      })
    ).toBeCloseTo((300 * 21) / 30, 6);
  });

  it("returns 0 when the client is not active in the period", () => {
    expect(
      prorateClientFee({
        monthlyFee: 300,
        billingType: "LEGACY",
        startDate: new Date(2026, 0, 1),
        endDate: null,
        periodYear: 2025,
        periodMonth: 11,
      })
    ).toBe(0);
  });

  it("treats the 31 Dec 2026 sentinel endDate as open-ended", () => {
    expect(
      prorateClientFee({
        monthlyFee: 400,
        billingType: "LEGACY",
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 11, 31), // sentinel -> null
        periodYear: 2026,
        periodMonth: 6,
      })
    ).toBe(400);
  });

  it("prorates a NEW client's final partial month", () => {
    // ends 15 May 2026 -> 15 active days of 31.
    expect(
      prorateClientFee({
        monthlyFee: 950,
        billingType: "NEW",
        startDate: new Date(2025, 11, 1),
        endDate: new Date(2026, 4, 15),
        periodYear: 2026,
        periodMonth: 5,
      })
    ).toBeCloseTo((950 * 15) / 31, 6);
  });
});

describe("prorateEngine - resource salary", () => {
  it("returns the full monthly salary for a full month under one revision", () => {
    expect(
      prorateResourceSalary({
        revisions: [{ effectiveFrom: new Date(2025, 0, 1), baseSalary: 30000 }],
        joinedDate: new Date(2025, 0, 1),
        terminatedDate: null,
        periodYear: 2026,
        periodMonth: 6, // June, 30 days
      })
    ).toBeCloseTo(30000, 6);
  });

  it("prorates a mid-month termination", () => {
    // termed 15 Jun 2026 -> 15 of 30 days.
    expect(
      prorateResourceSalary({
        revisions: [{ effectiveFrom: new Date(2025, 0, 1), baseSalary: 30000 }],
        joinedDate: new Date(2025, 0, 1),
        terminatedDate: new Date(2026, 5, 15),
        periodYear: 2026,
        periodMonth: 6,
      })
    ).toBeCloseTo(15000, 6);
  });

  it("prorates a mid-month join", () => {
    // joined 15 Jun 2026 -> days 15..30 = 16 of 30 days.
    expect(
      prorateResourceSalary({
        revisions: [{ effectiveFrom: new Date(2026, 5, 15), baseSalary: 30000 }],
        joinedDate: new Date(2026, 5, 15),
        terminatedDate: null,
        periodYear: 2026,
        periodMonth: 6,
      })
    ).toBeCloseTo((30000 * 16) / 30, 6);
  });

  it("applies a mid-month salary revision day-accurately", () => {
    // days 1..15 @ 20000, days 16..30 @ 30000 (June, 30 days).
    expect(
      prorateResourceSalary({
        revisions: [
          { effectiveFrom: new Date(2026, 0, 1), baseSalary: 20000 },
          { effectiveFrom: new Date(2026, 5, 16), baseSalary: 30000 },
        ],
        joinedDate: new Date(2025, 0, 1),
        terminatedDate: null,
        periodYear: 2026,
        periodMonth: 6,
      })
    ).toBeCloseTo((20000 * 15) / 30 + (30000 * 15) / 30, 6);
  });

  it("returns 0 when no revision is yet in effect", () => {
    expect(
      prorateResourceSalary({
        revisions: [{ effectiveFrom: new Date(2026, 8, 1), baseSalary: 30000 }],
        joinedDate: new Date(2025, 0, 1),
        terminatedDate: null,
        periodYear: 2026,
        periodMonth: 6,
      })
    ).toBe(0);
  });

  it("handles a join-and-terminate within the same month", () => {
    // joined 5 Jun, termed 14 Jun 2026 -> days 5..14 = 10 of 30.
    expect(
      prorateResourceSalary({
        revisions: [{ effectiveFrom: new Date(2026, 5, 5), baseSalary: 30000 }],
        joinedDate: new Date(2026, 5, 5),
        terminatedDate: new Date(2026, 5, 14),
        periodYear: 2026,
        periodMonth: 6,
      })
    ).toBeCloseTo((30000 * 10) / 30, 6);
  });
});
