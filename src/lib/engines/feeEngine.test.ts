import { describe, it, expect } from "vitest";
import {
  calculateRevenueWaterfall,
  calculateStripeFee,
  calculateTxnFee,
} from "./feeEngine";
import { DEFAULT_SYSTEM_CONFIG } from "./types";

const config = DEFAULT_SYSTEM_CONFIG;

describe("feeEngine - txn fee", () => {
  it("Card txn fee is 4%", () => {
    expect(calculateTxnFee(200, "CARD", config)).toBeCloseTo(8, 6);
  });
  it("ACH txn fee is 1.5%", () => {
    expect(calculateTxnFee(200, "ACH", config)).toBeCloseTo(3, 6);
  });
});

describe("feeEngine - stripe fee", () => {
  it("Card stripe is 2.5% + $0.30", () => {
    expect(calculateStripeFee(280.8, "CARD", config)).toBeCloseTo(7.32, 6);
  });
  it("ACH stripe uses 0.8% when below the $5 cap", () => {
    // $500 × 0.8% = $4.00 -> below cap -> $4.00
    expect(calculateStripeFee(500, "ACH", config)).toBeCloseTo(4, 6);
  });
  it("ACH stripe caps at $5 for larger amounts", () => {
    // $1000 × 0.8% = $8.00 -> capped -> $5.00
    expect(calculateStripeFee(1000, "ACH", config)).toBeCloseTo(5, 6);
    // $2030 × 0.8% = $16.24 -> capped -> $5.00
    expect(calculateStripeFee(2030, "ACH", config)).toBeCloseTo(5, 6);
  });
});

describe("feeEngine - txn fee toggle", () => {
  it("returns 0 when txn fee is disabled", () => {
    expect(calculateTxnFee(200, "CARD", config, false)).toBe(0);
    expect(calculateTxnFee(200, "ACH", config, false)).toBe(0);
  });
  it("charges normally when enabled", () => {
    expect(calculateTxnFee(200, "CARD", config, true)).toBeCloseTo(8, 6);
  });
});

describe("feeEngine - full waterfall (ACH, 20% discount)", () => {
  const w = calculateRevenueWaterfall({
    totalServiceCostUsd: 250,
    proratedFeeUsd: 250,
    discountPct: 20,
    paymentMethod: "ACH",
    config,
  });

  it("computes discount and discounted fee", () => {
    expect(w.discountUsd).toBeCloseTo(50, 6);
    expect(w.discountedFeeUsd).toBeCloseTo(200, 6);
  });
  it("computes txn fee and net service cost", () => {
    expect(w.txnFeeUsd).toBeCloseTo(3, 6);
    expect(w.netServiceCostUsd).toBeCloseTo(203, 6);
  });
  it("computes stripe (0.8% below cap) and gross revenue", () => {
    // net service cost 203 -> 203 × 0.8% = 1.624 (below $5 cap)
    expect(w.stripeFeeUsd).toBeCloseTo(1.624, 6);
    expect(w.grossRevenueUsd).toBeCloseTo(201.376, 6);
  });
  it("computes abbie, reserve and net revenue (USD)", () => {
    expect(w.abbieRoyaltyUsd).toBeCloseTo(20.1376, 6);
    expect(w.reserveFundUsd).toBeCloseTo(30.2064, 6);
    expect(w.netRevenueUsd).toBeCloseTo(151.032, 6);
  });
  it("computes skydo, net USD and net revenue INR", () => {
    expect(w.skydoFeeUsd).toBeCloseTo(3.02064, 6);
    expect(w.netUsdToConvert).toBeCloseTo(148.01136, 6);
    expect(w.usdInrRate).toBe(91);
    expect(w.netRevenueInr).toBeCloseTo(13469.03376, 4);
  });
});

describe("feeEngine - txn fee disabled waterfall (ACH)", () => {
  const w = calculateRevenueWaterfall({
    totalServiceCostUsd: 250,
    proratedFeeUsd: 250,
    discountPct: 20,
    paymentMethod: "ACH",
    config,
    txnFeeEnabled: false,
  });
  it("zeroes the txn fee and net service cost equals discounted fee", () => {
    expect(w.txnFeeUsd).toBe(0);
    expect(w.netServiceCostUsd).toBeCloseTo(200, 6);
  });
});

describe("feeEngine - full waterfall (Card, 10% discount)", () => {
  const w = calculateRevenueWaterfall({
    totalServiceCostUsd: 300,
    proratedFeeUsd: 300,
    discountPct: 10,
    paymentMethod: "CARD",
    config,
  });

  it("computes the chain through to INR", () => {
    expect(w.discountUsd).toBeCloseTo(30, 6);
    expect(w.discountedFeeUsd).toBeCloseTo(270, 6);
    expect(w.txnFeeUsd).toBeCloseTo(10.8, 6);
    expect(w.netServiceCostUsd).toBeCloseTo(280.8, 6);
    expect(w.stripeFeeUsd).toBeCloseTo(7.32, 6);
    expect(w.grossRevenueUsd).toBeCloseTo(273.48, 6);
    expect(w.abbieRoyaltyUsd).toBeCloseTo(27.348, 6);
    expect(w.reserveFundUsd).toBeCloseTo(41.022, 6);
    expect(w.netRevenueUsd).toBeCloseTo(205.11, 6);
    expect(w.skydoFeeUsd).toBeCloseTo(4.1022, 6);
    expect(w.netUsdToConvert).toBeCloseTo(201.0078, 6);
    expect(w.netRevenueInr).toBeCloseTo(18291.7098, 3);
  });
});

describe("feeEngine - zero discount", () => {
  it("passes the prorated fee straight through as discounted fee", () => {
    const w = calculateRevenueWaterfall({
      totalServiceCostUsd: 500,
      proratedFeeUsd: 500,
      discountPct: 0,
      paymentMethod: "ACH",
      config,
    });
    expect(w.discountUsd).toBe(0);
    expect(w.discountedFeeUsd).toBe(500);
  });
});
