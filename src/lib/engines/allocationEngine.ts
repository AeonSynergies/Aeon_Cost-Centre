/**
 * allocationEngine — splits monthly net revenue (INR) into the four buckets.
 * The percentages must sum to 100.
 */

export function validateAllocationPcts(params: {
  deptReservePct: number;
  businessDevPct: number;
  productDevPct: number;
  profitPct: number;
}): boolean {
  const sum =
    params.deptReservePct +
    params.businessDevPct +
    params.productDevPct +
    params.profitPct;
  // tolerate floating point noise
  return Math.abs(sum - 100) < 0.0001;
}

export function calculateAllocation(params: {
  netRevenueInr: number;
  deptReservePct: number;
  businessDevPct: number;
  productDevPct: number;
  profitPct: number;
}): {
  deptReserveInr: number;
  businessDevInr: number;
  productDevInr: number;
  profitInr: number;
} {
  if (!validateAllocationPcts(params)) {
    throw new Error(
      "Allocation percentages must sum to 100 (received " +
        [
          params.deptReservePct,
          params.businessDevPct,
          params.productDevPct,
          params.profitPct,
        ].join(" + ") +
        ")"
    );
  }

  const { netRevenueInr } = params;
  return {
    deptReserveInr: netRevenueInr * (params.deptReservePct / 100),
    businessDevInr: netRevenueInr * (params.businessDevPct / 100),
    productDevInr: netRevenueInr * (params.productDevPct / 100),
    profitInr: netRevenueInr * (params.profitPct / 100),
  };
}
