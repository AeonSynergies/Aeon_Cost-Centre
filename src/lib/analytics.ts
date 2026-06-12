/**
 * Analytics aggregation helpers shared by the analytical + allocation + dashboard
 * API routes. These compose the pure calculation engines (via lib/metrics) with
 * DB records so routes never re-implement formulas inline.
 */
import { prisma } from "@/lib/prisma";
import { getSystemConfig, ratesFromConfig } from "@/lib/config";
import {
  computeClientWaterfall,
  computeResourceCost,
  isResourceActive,
  type Period,
} from "@/lib/metrics";
import type { RevenueWaterfall } from "@/lib/engines/feeEngine";
import type { SystemConfigValues } from "@/lib/engines/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = MONTHS;
const SENTINEL = new Date(2026, 11, 31).getTime();

export function isAssignmentActive(a: { assignedFrom: Date; assignedTo: Date | null }, p: Period): boolean {
  const end = new Date(p.year, p.month, 0);
  const start = new Date(p.year, p.month - 1, 1);
  return a.assignedFrom <= end && (!a.assignedTo || a.assignedTo >= start);
}

export function clientActive(endDate: Date | null, p: Period): boolean {
  if (!endDate) return true;
  if (endDate.getTime() === SENTINEL) return true;
  const start = new Date(p.year, p.month - 1, 1);
  return endDate >= start;
}

export type CoreClient = Awaited<ReturnType<typeof loadClients>>[number];
export type CoreResource = Awaited<ReturnType<typeof loadResources>>[number];

function loadClients() {
  return prisma.client.findMany({
    include: { services: { include: { service: { select: { id: true, code: true, departmentId: true } } } } },
  });
}

function loadResources(period: Period) {
  return prisma.resource.findMany({
    include: {
      revisions: true,
      costCentre: true,
      extraCosts: true,
      department: { select: { id: true, name: true, category: true } },
      assignments: { include: { client: { select: { id: true, name: true } }, service: { select: { id: true, code: true, name: true, departmentId: true } } } },
      utilisationLogs: { where: { periodYear: period.year, periodMonth: period.month } },
    },
  });
}

export interface AnalyticsCore {
  config: SystemConfigValues;
  rates: ReturnType<typeof ratesFromConfig>;
  clients: CoreClient[];
  resources: CoreResource[];
}

export async function loadCore(period: Period): Promise<AnalyticsCore> {
  const [config, clients, resources] = await Promise.all([getSystemConfig(), loadClients(), loadResources(period)]);
  return { config, rates: ratesFromConfig(config), clients, resources };
}

/** Waterfall per client + per-service net revenue (INR) attribution for a period. */
export function revenueMaps(clients: CoreClient[], config: SystemConfigValues, period: Period) {
  const waterfalls = new Map<string, RevenueWaterfall>();
  const serviceNetByKey = new Map<string, number>(); // `${clientId}|${serviceId}`
  const serviceNetByService = new Map<string, number>();

  for (const c of clients) {
    const totalFee = c.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
    const wf = computeClientWaterfall(
      { startDate: c.startDate, endDate: c.endDate, billingType: c.billingType, paymentMethod: c.paymentMethod, txnFeeEnabled: c.txnFeeEnabled, services: c.services },
      config,
      period
    );
    waterfalls.set(c.id, wf);
    if (totalFee <= 0) continue;
    for (const cs of c.services) {
      const net = wf.netRevenueInr * (cs.monthlyFeeUsd / totalFee);
      serviceNetByKey.set(`${c.id}|${cs.serviceId}`, net);
      serviceNetByService.set(cs.serviceId, (serviceNetByService.get(cs.serviceId) ?? 0) + net);
    }
  }
  return { waterfalls, serviceNetByKey, serviceNetByService };
}

export interface ResourceAllocationRow {
  resourceId: string;
  resource: string;
  employeeNumber: string;
  departmentId: string;
  department: string;
  costCentre: string;
  isBillable: boolean;
  clients: number;
  services: string[];
  revenueInr: number;
  allottedInr: number;
  costInr: number;
  surplusInr: number;
  marginPct: number;
  utilisationPct: number;
}

/** Per-resource revenue/cost/margin for a period (engine-driven). */
export function resourceAllocation(core: AnalyticsCore, period: Period): ResourceAllocationRow[] {
  const { serviceNetByKey } = revenueMaps(core.clients, core.config, period);

  // Billable resource count per (client|service) active in period.
  const billableCount = new Map<string, number>();
  for (const r of core.resources) {
    if (!r.isBillable) continue;
    for (const a of r.assignments) {
      if (!isAssignmentActive(a, period)) continue;
      const key = `${a.clientId}|${a.serviceId}`;
      billableCount.set(key, (billableCount.get(key) ?? 0) + 1);
    }
  }

  const rows: ResourceAllocationRow[] = [];
  for (const r of core.resources) {
    const active = r.assignments.filter((a) => isAssignmentActive(a, period));
    let revenue = 0;
    const clientSet = new Set<string>();
    const codes = new Set<string>();
    for (const a of active) {
      clientSet.add(a.clientId);
      codes.add(a.service.code);
      if (!r.isBillable) continue;
      const key = `${a.clientId}|${a.serviceId}`;
      revenue += (serviceNetByKey.get(key) ?? 0) / (billableCount.get(key) ?? 1);
    }
    const allotted = revenue * 0.5;
    const cost = computeResourceCost(r, core.config, period).totalCostInr;
    const util = r.utilisationLogs.length ? r.utilisationLogs.reduce((s, l) => s + l.utilisationPct, 0) / r.utilisationLogs.length : 0;
    rows.push({
      resourceId: r.id,
      resource: r.name,
      employeeNumber: r.employeeNumber,
      departmentId: r.departmentId,
      department: r.department.name,
      costCentre: r.costCentre.name,
      isBillable: r.isBillable,
      clients: clientSet.size,
      services: Array.from(codes),
      revenueInr: revenue,
      allottedInr: allotted,
      costInr: cost,
      surplusInr: allotted - cost,
      marginPct: allotted > 0 ? ((allotted - cost) / allotted) * 100 : 0,
      utilisationPct: util,
    });
  }
  return rows;
}
