/**
 * costEngine — fully-loaded monthly cost of a resource, in INR and USD.
 *
 * Components (all INR):
 *   base salary (already prorated) + incentive + allowance
 *   + overhead (manual override, else overheadPct of base salary)
 *   + laptop amortised (laptopCost / amortisationMonths)
 *   + MS365 seat cost (ms365RateInr)
 *   + Zoom seat cost (zoomRateUsd converted to INR at Rate B)
 *
 * totalCostUsd is the INR total displayed in USD at Rate D.
 */
import { inrToUsdDisplay } from "./currencyEngine";

export function calculateFullyLoadedCost(params: {
  baseSalary: number;
  incentive: number;
  allowance: number;
  overheadManual: number | null;
  overheadPct: number;
  laptopCostInr: number | null;
  amortisationMonths: number;
  ms365RateInr: number;
  zoomRateUsd: number;
  rateB: number; // USD expense -> INR
  rateD: number; // INR -> USD display
  /** Sum of active recurring (MONTHLY) extra costs in INR. Optional. */
  extraMonthlyInr?: number;
}): {
  baseSalary: number;
  incentive: number;
  allowance: number;
  overhead: number;
  laptopAmortised: number;
  ms365Cost: number;
  zoomCost: number;
  extraMonthly: number;
  totalCostInr: number;
  totalCostUsd: number;
} {
  const {
    baseSalary,
    incentive,
    allowance,
    overheadManual,
    overheadPct,
    laptopCostInr,
    amortisationMonths,
    ms365RateInr,
    zoomRateUsd,
    rateB,
    rateD,
    extraMonthlyInr = 0,
  } = params;

  const overhead =
    overheadManual != null ? overheadManual : baseSalary * (overheadPct / 100);

  const laptopAmortised =
    laptopCostInr != null && amortisationMonths > 0
      ? laptopCostInr / amortisationMonths
      : 0;

  const ms365Cost = ms365RateInr;
  const zoomCost = zoomRateUsd * rateB;

  const totalCostInr =
    baseSalary +
    incentive +
    allowance +
    overhead +
    laptopAmortised +
    ms365Cost +
    zoomCost +
    extraMonthlyInr;

  const totalCostUsd = inrToUsdDisplay(totalCostInr, rateD, 0);

  return {
    baseSalary,
    incentive,
    allowance,
    overhead,
    laptopAmortised,
    ms365Cost,
    zoomCost,
    extraMonthly: extraMonthlyInr,
    totalCostInr,
    totalCostUsd,
  };
}
