import { describe, it, expect } from "vitest";
import {
  getServiceHours,
  getInvoiceHours,
  calculateUtilisation,
  DEFAULT_UTIL_TIERS,
} from "./utilisationEngine";

describe("utilisationEngine - service hours", () => {
  it("returns 0 for no transactions", () => {
    expect(getServiceHours(0)).toBe(0);
  });
  it("matches tier 1 (<=10)", () => {
    expect(getServiceHours(5)).toBe(0.1);
    expect(getServiceHours(10)).toBe(0.1);
  });
  it("matches tier 2 (<=15)", () => {
    expect(getServiceHours(12)).toBe(0.15);
  });
  it("matches tier 3 (<=30)", () => {
    expect(getServiceHours(25)).toBe(0.25);
  });
  it("matches tier 4 (<=50)", () => {
    expect(getServiceHours(45)).toBe(0.45);
  });
  it("uses the top tier for volumes above the highest threshold", () => {
    expect(getServiceHours(80, DEFAULT_UTIL_TIERS)).toBe(0.45);
  });
});

describe("utilisationEngine - invoice hours", () => {
  const base = {
    routeThreshold: 50,
    belowThresholdHrs: 1.0,
    aboveThresholdHrs: 1.5,
    fleetAddOn: 0.5,
    marshAddOn: 0.5,
  };

  it("returns 0 when no routes were run", () => {
    expect(
      getInvoiceHours({ ...base, routesRan: 0, fleetInvoice: true, marshInvoice: true })
    ).toBe(0);
  });
  it("uses below-threshold hours under the threshold", () => {
    expect(
      getInvoiceHours({ ...base, routesRan: 30, fleetInvoice: false, marshInvoice: false })
    ).toBe(1.0);
  });
  it("uses above-threshold hours over the threshold", () => {
    expect(
      getInvoiceHours({ ...base, routesRan: 60, fleetInvoice: false, marshInvoice: false })
    ).toBe(1.5);
  });
  it("adds fleet and marsh add-ons", () => {
    expect(
      getInvoiceHours({ ...base, routesRan: 30, fleetInvoice: true, marshInvoice: true })
    ).toBe(2.0);
  });
});

describe("utilisationEngine - capacity", () => {
  it("HEALTHY at >= 80%", () => {
    const r = calculateUtilisation({
      serviceHoursPerDay: 0,
      invoiceHoursPerDay: 0,
      adocHoursPerDay: 7,
    });
    expect(r.totalHoursPerDay).toBe(7);
    expect(r.utilisationPct).toBeCloseTo(87.5, 6);
    expect(r.monthlyHours).toBeCloseTo(154, 6);
    expect(r.capacityStatus).toBe("HEALTHY");
  });
  it("UNDER_UTILISED between 40 and 79%", () => {
    const r = calculateUtilisation({
      serviceHoursPerDay: 0.45,
      invoiceHoursPerDay: 1.0,
      adocHoursPerDay: 2.0,
    });
    expect(r.totalHoursPerDay).toBeCloseTo(3.45, 6);
    expect(r.utilisationPct).toBeCloseTo(43.125, 6);
    expect(r.capacityStatus).toBe("UNDER_UTILISED");
  });
  it("SEVERELY_UNDER below 40%", () => {
    const r = calculateUtilisation({
      serviceHoursPerDay: 0,
      invoiceHoursPerDay: 0,
      adocHoursPerDay: 2,
    });
    expect(r.utilisationPct).toBe(25);
    expect(r.capacityStatus).toBe("SEVERELY_UNDER");
  });
  it("OVER_CAPACITY above 100%", () => {
    const r = calculateUtilisation({
      serviceHoursPerDay: 0,
      invoiceHoursPerDay: 0,
      adocHoursPerDay: 9,
    });
    expect(r.utilisationPct).toBe(112.5);
    expect(r.capacityStatus).toBe("OVER_CAPACITY");
  });
  it("honours custom available hours and working days", () => {
    const r = calculateUtilisation({
      serviceHoursPerDay: 2,
      invoiceHoursPerDay: 0,
      adocHoursPerDay: 0,
      availableHoursPerDay: 10,
      workingDaysPerMonth: 20,
    });
    expect(r.utilisationPct).toBe(20);
    expect(r.monthlyHours).toBe(40);
  });
});
