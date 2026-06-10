import { describe, it, expect } from "vitest";
import {
  usdToInrRevenue,
  usdExpenseToInr,
  skydoConversionRate,
  inrToUsdDisplay,
  effectiveRates,
} from "./currencyEngine";

describe("currencyEngine", () => {
  it("Rate A: converts client revenue USD to INR at the fixed rate", () => {
    expect(usdToInrRevenue(100, 91)).toBe(9100);
    expect(usdToInrRevenue(0, 91)).toBe(0);
  });

  it("Rate B: converts USD expenses to INR at market + markupB", () => {
    expect(usdExpenseToInr(100, 84, 2)).toBe(8600);
  });

  it("Rate C: computes the Skydo settlement rate", () => {
    expect(skydoConversionRate(84, 2)).toBe(82);
  });

  it("Rate D: displays INR as USD at market - markupD", () => {
    expect(inrToUsdDisplay(8000, 84, 4)).toBe(100);
  });

  it("Rate D: guards against non-positive rate", () => {
    expect(inrToUsdDisplay(8000, 4, 4)).toBe(0);
  });

  it("computes the four effective rates from defaults", () => {
    expect(
      effectiveRates({
        fixedRate: 91,
        marketRate: 84,
        markupB: 2,
        skydoMarkup: 2,
        markupD: 4,
      })
    ).toEqual({ rateA: 91, rateB: 86, rateC: 82, rateD: 80 });
  });
});
