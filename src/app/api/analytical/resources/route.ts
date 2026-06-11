import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { computeResourceCost, isResourceActive, currentPeriod, type Period } from "@/lib/metrics";
import { inrToUsdDisplay } from "@/lib/engines/currencyEngine";
import { loadCore, revenueMaps, resourceAllocation, isAssignmentActive, clientActive } from "@/lib/analytics";

function periodFromQuery(url: string): Period {
  const sp = new URL(url).searchParams;
  const y = Number(sp.get("year"));
  const m = Number(sp.get("month"));
  if (y && m) return { year: y, month: m };
  return currentPeriod();
}

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const departmentId = sp.get("departmentId") || "";
  const status = sp.get("status") || "";
  const billable = sp.get("billable") || "";
  const period = periodFromQuery(req.url);

  const core = await loadCore(period);
  const rateD = core.rates.rateD;
  const alloc = new Map(resourceAllocation(core, period).map((r) => [r.resourceId, r]));
  const { serviceNetByKey } = revenueMaps(core.clients, core.config, period);

  // clientService fee/package lookup + billable counts.
  const csByKey = new Map<string, { fee: number; pkg: string }>();
  for (const c of core.clients) for (const cs of c.services) csByKey.set(`${c.id}|${cs.serviceId}`, { fee: cs.monthlyFeeUsd, pkg: cs.packageType });
  const billableCount = new Map<string, number>();
  for (const r of core.resources) if (r.isBillable) for (const a of r.assignments) if (isAssignmentActive(a, period)) {
    const k = `${a.clientId}|${a.serviceId}`; billableCount.set(k, (billableCount.get(k) ?? 0) + 1);
  }

  let resources = core.resources;
  if (departmentId) resources = resources.filter((r) => r.departmentId === departmentId);
  if (status) resources = resources.filter((r) => (isResourceActive(r, period) ? "ACTIVE" : "TERMED") === status);
  if (billable === "true") resources = resources.filter((r) => r.isBillable);
  else if (billable === "false") resources = resources.filter((r) => !r.isBillable);

  const rows = resources.map((r) => {
    const cost = computeResourceCost(r, core.config, period);
    const latest = [...r.revisions].sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
    const a = alloc.get(r.id);
    const revShare = a?.allottedInr ?? 0;
    const margin = revShare - cost.totalCostInr;
    return {
      id: r.id, employeeNumber: r.employeeNumber, name: r.name, title: r.title,
      department: r.department.name, costCentre: r.costCentre.name,
      joinedDate: r.joinedDate, status: isResourceActive(r, period) ? "ACTIVE" : "TERMED", isBillable: r.isBillable,
      baseSalary: cost.baseSalary, incentive: cost.incentive, allowance: cost.allowance,
      overhead: cost.overhead, laptopAmortised: cost.laptopAmortised, toolCostInr: cost.ms365Cost + cost.zoomCost,
      totalCostInr: cost.totalCostInr, totalCostUsd: cost.totalCostUsd,
      revenueShareInr: revShare, grossMarginInr: margin, grossMarginUsd: inrToUsdDisplay(margin, rateD, 0),
      marginPct: revShare > 0 ? (margin / revShare) * 100 : 0,
      utilisationPct: a?.utilisationPct ?? 0,
    };
  });

  const kpi = {
    salaryInr: rows.reduce((s, r) => s + r.baseSalary, 0),
    fullyLoadedInr: rows.reduce((s, r) => s + r.totalCostInr, 0),
    revShareInr: rows.reduce((s, r) => s + r.revenueShareInr, 0),
    avgMarginPct: rows.length ? rows.reduce((s, r) => s + r.marginPct, 0) / rows.length : 0,
  };

  // Supporting assignment detail.
  const assignments: Array<Record<string, unknown>> = [];
  for (const r of resources) {
    for (const a of r.assignments) {
      if (!isAssignmentActive(a, period)) continue;
      const key = `${a.clientId}|${a.serviceId}`;
      const cs = csByKey.get(key);
      const share = r.isBillable ? (serviceNetByKey.get(key) ?? 0) / (billableCount.get(key) ?? 1) * 0.5 : 0;
      const log = r.utilisationLogs.find((l) => l.clientId === a.clientId);
      assignments.push({
        resourceId: r.id, resource: r.name, clientId: a.clientId, client: a.client.name,
        serviceCode: a.service.code, packageType: cs?.pkg ?? "", monthlyFeeUsd: cs?.fee ?? 0,
        assignedFrom: a.assignedFrom, assignedTo: a.assignedTo,
        revenueShareInr: share, utilisationPct: log?.utilisationPct ?? 0,
        status: !a.assignedTo || new Date(a.assignedTo) >= new Date() ? "ACTIVE" : "TERMED",
      });
    }
  }
  void clientActive;

  const assignKpi = {
    total: assignments.length,
    clients: new Set(assignments.map((a) => a.clientId as string)).size,
    revShareInr: assignments.reduce((s, a) => s + (a.revenueShareInr as number), 0),
    avgUtilPct: assignments.length ? assignments.reduce((s, a) => s + (a.utilisationPct as number), 0) / assignments.length : 0,
  };

  return NextResponse.json({ kpi, rows, assignments, assignKpi });
}
