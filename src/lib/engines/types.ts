/**
 * Shared types for the calculation engines.
 * SystemConfigValues mirrors the keys stored in the SystemConfig table
 * (see prisma/seed.ts) and is consumed by feeEngine and others.
 */
export interface SystemConfigValues {
  usd_inr_fixed_rate: number; // Rate A
  usd_inr_market_rate: number; // market rate
  expense_markup_b: number; // Rate B markup (+)
  skydo_markup: number; // Rate C markup (-)
  expense_markup_d: number; // Rate D markup (-)
  skydo_fee_pct: number;
  abbie_royalty_pct: number;
  reserve_fund_pct: number;
  card_txn_fee_pct: number;
  ach_txn_fee_pct: number;
  stripe_card_pct: number;
  stripe_card_fixed: number;
  stripe_ach_pct: number;
  stripe_ach_min: number;
  overhead_pct: number;
  working_days_per_month: number;
  available_hrs_per_day: number;
  laptop_amortisation_months: number;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfigValues = {
  usd_inr_fixed_rate: 91,
  usd_inr_market_rate: 84,
  expense_markup_b: 2,
  skydo_markup: 2,
  expense_markup_d: 4,
  skydo_fee_pct: 2,
  abbie_royalty_pct: 10,
  reserve_fund_pct: 15,
  card_txn_fee_pct: 4,
  ach_txn_fee_pct: 1.5,
  stripe_card_pct: 2.5,
  stripe_card_fixed: 0.3,
  stripe_ach_pct: 0.8,
  stripe_ach_min: 5.0,
  overhead_pct: 10,
  working_days_per_month: 22,
  available_hrs_per_day: 8,
  laptop_amortisation_months: 36,
};

export type PaymentMethod = "CARD" | "ACH";
export type BillingType = "LEGACY" | "NEW";
