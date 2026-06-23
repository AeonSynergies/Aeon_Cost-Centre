/**
 * feeEngine — the client revenue waterfall.
 *
 * Order of operations (all amounts USD unless noted):
 *   Total Service Cost
 *     -> Prorated Fee (computed upstream by prorateEngine)
 *     -> Discount        = proratedFee * discountPct
 *     -> Discounted Fee  = proratedFee - discount
 *     -> Txn Fee         = Card 4% / ACH 1.5% of discountedFee
 *     -> Net Service Cost= discountedFee + txnFee
 *     -> Stripe Fee      = Card 2.5% + $0.30 / ACH 0.8% min $5 of netServiceCost
 *     -> Gross Revenue   = netServiceCost - stripe
 *     -> Abbie Royalty   = grossRevenue * 10%
 *     -> Reserve Fund    = grossRevenue * 15%
 *     -> Net Revenue USD = grossRevenue - abbie - reserve
 *     -> Skydo Fee       = netRevenue * skydoFeePct (2%)
 *     -> Net USD         = netRevenue - skydoFee
 *     -> Net Revenue INR = netUsd * Rate A (91)
 */
import { usdToInrRevenue } from "./currencyEngine";
import type { PaymentMethod, SystemConfigValues } from "./types";

export interface RevenueWaterfall {
  totalServiceCostUsd: number;
  proratedFeeUsd: number;
  discountUsd: number;
  discountedFeeUsd: number;
  txnFeeUsd: number;
  netServiceCostUsd: number;
  stripeFeeUsd: number;
  grossRevenueUsd: number;
  abbieRoyaltyUsd: number;
  reserveFundUsd: number;
  netRevenueUsd: number;
  skydoFeeUsd: number;
  netUsdToConvert: number;
  usdInrRate: number;
  netRevenueInr: number;
}

/**
 * Stripe processing fee on a gross value.
 * Card: 2.5% + $0.30. ACH: 0.8% CAPPED at $5 (use the lesser of 0.8% and $5).
 */
export function calculateStripeFee(
  grossValue: number,
  method: PaymentMethod,
  config: SystemConfigValues
): number {
  if (method === "CARD") {
    return grossValue * (config.stripe_card_pct / 100) + config.stripe_card_fixed;
  }
  const fee = grossValue * (config.stripe_ach_pct / 100);
  return Math.min(fee, config.stripe_ach_cap);
}

/**
 * Transaction fee added on top of the discounted fee.
 * Card: 4%. ACH: 1.5%. Returns 0 when the client has txn fees disabled.
 */
export function calculateTxnFee(
  discountedFee: number,
  method: PaymentMethod,
  config: SystemConfigValues,
  txnFeeEnabled: boolean = true
): number {
  if (!txnFeeEnabled) return 0;
  const pct =
    method === "CARD" ? config.card_txn_fee_pct : config.ach_txn_fee_pct;
  return discountedFee * (pct / 100);
}

export function calculateRevenueWaterfall(params: {
  totalServiceCostUsd: number;
  proratedFeeUsd: number;
  discountPct: number;
  paymentMethod: PaymentMethod;
  config: SystemConfigValues;
  txnFeeEnabled?: boolean;
}): RevenueWaterfall {
  const { totalServiceCostUsd, proratedFeeUsd, discountPct, paymentMethod, config } =
    params;
  const txnFeeEnabled = params.txnFeeEnabled ?? true;

  // No prorated fee (e.g. client churned before/at the period) -> no charges at
  // all. Guard here so the CARD fixed Stripe fee ($0.30) doesn't leak through.
  if (proratedFeeUsd <= 0) {
    return {
      totalServiceCostUsd, proratedFeeUsd: 0, discountUsd: 0, discountedFeeUsd: 0, txnFeeUsd: 0,
      netServiceCostUsd: 0, stripeFeeUsd: 0, grossRevenueUsd: 0, abbieRoyaltyUsd: 0, reserveFundUsd: 0,
      netRevenueUsd: 0, skydoFeeUsd: 0, netUsdToConvert: 0, usdInrRate: config.usd_inr_fixed_rate, netRevenueInr: 0,
    };
  }

  const discountUsd = proratedFeeUsd * (discountPct / 100);
  const discountedFeeUsd = proratedFeeUsd - discountUsd;

  const txnFeeUsd = calculateTxnFee(discountedFeeUsd, paymentMethod, config, txnFeeEnabled);
  const netServiceCostUsd = discountedFeeUsd + txnFeeUsd;

  const stripeFeeUsd = calculateStripeFee(netServiceCostUsd, paymentMethod, config);
  const grossRevenueUsd = netServiceCostUsd - stripeFeeUsd;

  const abbieRoyaltyUsd = grossRevenueUsd * (config.abbie_royalty_pct / 100);
  const reserveFundUsd = grossRevenueUsd * (config.reserve_fund_pct / 100);
  const netRevenueUsd = grossRevenueUsd - abbieRoyaltyUsd - reserveFundUsd;

  const skydoFeeUsd = netRevenueUsd * (config.skydo_fee_pct / 100);
  const netUsdToConvert = netRevenueUsd - skydoFeeUsd;

  const usdInrRate = config.usd_inr_fixed_rate;
  const netRevenueInr = usdToInrRevenue(netUsdToConvert, usdInrRate);

  return {
    totalServiceCostUsd,
    proratedFeeUsd,
    discountUsd,
    discountedFeeUsd,
    txnFeeUsd,
    netServiceCostUsd,
    stripeFeeUsd,
    grossRevenueUsd,
    abbieRoyaltyUsd,
    reserveFundUsd,
    netRevenueUsd,
    skydoFeeUsd,
    netUsdToConvert,
    usdInrRate,
    netRevenueInr,
  };
}
