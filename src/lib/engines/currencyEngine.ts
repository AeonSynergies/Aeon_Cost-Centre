/**
 * currencyEngine — four conversion rates, all sourced from SystemConfig.
 *
 * Rate A: USD -> INR for client revenue = usd_inr_fixed_rate (default 91)
 * Rate B: USD expenses -> INR = market_rate + expense_markup_b (default 84 + 2 = 86)
 * Rate C: Skydo actual conversion = market_rate - skydo_markup (default 84 - 2 = 82)
 * Rate D: INR -> USD display = market_rate - expense_markup_d (default 84 - 4 = 80)
 */

/** Rate A — client revenue USD converted to INR at the fixed rate. */
export function usdToInrRevenue(usd: number, fixedRate: number): number {
  return usd * fixedRate;
}

/** Rate B — a USD expense converted to INR at market + markupB. */
export function usdExpenseToInr(
  usd: number,
  marketRate: number,
  markupB: number
): number {
  return usd * (marketRate + markupB);
}

/** Rate C — the effective rate Skydo uses to settle USD -> INR. */
export function skydoConversionRate(
  marketRate: number,
  skydoMarkup: number
): number {
  return marketRate - skydoMarkup;
}

/** Rate D — INR amount expressed in USD for display, at market - markupD. */
export function inrToUsdDisplay(
  inr: number,
  marketRate: number,
  markupD: number
): number {
  const rate = marketRate - markupD;
  if (rate <= 0) return 0;
  return inr / rate;
}

/** Convenience: compute the four effective rates from raw config values. */
export function effectiveRates(params: {
  fixedRate: number;
  marketRate: number;
  markupB: number;
  skydoMarkup: number;
  markupD: number;
}): { rateA: number; rateB: number; rateC: number; rateD: number } {
  return {
    rateA: params.fixedRate,
    rateB: params.marketRate + params.markupB,
    rateC: params.marketRate - params.skydoMarkup,
    rateD: params.marketRate - params.markupD,
  };
}
