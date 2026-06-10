/**
 * revenueShareEngine — how INR net revenue is shared back to resources/depts.
 *
 * Resource share: 50% of the INR net revenue of the service the resource is
 * assigned to, divided by the number of billable resources on that service.
 *
 * Department share: 50% of the INR net revenue of the department's services.
 */

const SHARE_PCT = 0.5;

export function calculateResourceRevenueShare(params: {
  serviceNetRevenueInr: number;
  billableResourceCount: number;
}): number {
  const { serviceNetRevenueInr, billableResourceCount } = params;
  if (billableResourceCount <= 0) return 0;
  return (serviceNetRevenueInr * SHARE_PCT) / billableResourceCount;
}

export function calculateDeptRevenueShare(deptNetRevenueInr: number): number {
  return deptNetRevenueInr * SHARE_PCT;
}
