import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeResourceCost, currentPeriod, type Period } from "@/lib/metrics";
import { calculateUtilisation } from "@/lib/engines/utilisationEngine";
import { loadCore } from "@/lib/analytics";

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
  const period = periodFromQuery(req.url);

  const core = await loadCore(period);
  const available = core.config.available_hrs_per_day;
  const workingDays = core.config.working_days_per_month;

  type Row = {
    resourceId: string; resource: string; departmentId: string; clients: number;
    serviceHrs: number; invoiceHrs: number; adocHrs: number; totalHrs: number;
    utilisationPct: number; monthlyHrs: number; revenueAllottedInr: number;
    costInr: number; grossMarginInr: number; marginPct: number; status: string;
  };

  const rows: Row[] = [];
  for (const r of core.resources) {
    if (!r.isBillable) continue;
    const logs = r.utilisationLogs;
    if (departmentId && r.departmentId !== departmentId) continue;

    const serviceHrs = logs.reduce((s, l) => s + l.serviceHoursPerDay, 0);
    const invoiceHrs = logs.reduce((s, l) => s + l.invoiceHoursPerDay, 0);
    const adocHrs = logs.reduce((s, l) => s + l.adocHoursPerDay, 0);
    const util = calculateUtilisation({ serviceHoursPerDay: serviceHrs, invoiceHoursPerDay: invoiceHrs, adocHoursPerDay: adocHrs, availableHoursPerDay: available, workingDaysPerMonth: workingDays });
    const revenueAllotted = logs.reduce((s, l) => s + l.revenueShareInr, 0);
    const cost = computeResourceCost(r, core.config, period).totalCostInr;
    rows.push({
      resourceId: r.id, resource: r.name, departmentId: r.departmentId,
      clients: logs.length,
      serviceHrs, invoiceHrs, adocHrs, totalHrs: util.totalHoursPerDay,
      utilisationPct: util.utilisationPct, monthlyHrs: util.monthlyHours,
      revenueAllottedInr: revenueAllotted, costInr: cost,
      grossMarginInr: revenueAllotted - cost, marginPct: revenueAllotted > 0 ? ((revenueAllotted - cost) / revenueAllotted) * 100 : 0,
      status: util.capacityStatus,
    });
  }

  // Per-service utilisation tiers effective at the period start, grouped by service.
  const periodStart = new Date(Date.UTC(period.year, period.month - 1, 1));
  const services = await prisma.service.findMany({
    select: {
      id: true, code: true, name: true, departmentId: true,
      utilisationTiers: { where: { effectiveFrom: { lte: periodStart } }, orderBy: [{ tierNumber: "asc" }, { effectiveFrom: "desc" }] },
    },
  });
  // Keep only the latest-effective row per (service, tierNumber).
  const tiersByDept = new Map<string, { serviceCode: string; serviceName: string; tiers: { tierNumber: number; maxTxnVolume: number; hoursPerDay: number }[] }[]>();
  for (const svc of services) {
    const seen = new Set<number>();
    const tiers: { tierNumber: number; maxTxnVolume: number; hoursPerDay: number }[] = [];
    for (const t of svc.utilisationTiers) {
      if (seen.has(t.tierNumber)) continue;
      seen.add(t.tierNumber);
      tiers.push({ tierNumber: t.tierNumber, maxTxnVolume: t.maxTxnVolume, hoursPerDay: t.hoursPerDay });
    }
    if (tiers.length === 0) continue;
    tiers.sort((a, b) => a.tierNumber - b.tierNumber);
    const list = tiersByDept.get(svc.departmentId) ?? [];
    list.push({ serviceCode: svc.code, serviceName: svc.name, tiers });
    tiersByDept.set(svc.departmentId, list);
  }

  // Client-facing departments with their rows.
  const cfDepts = Array.from(new Map(core.resources.filter((r) => r.department.category === "CLIENT_FACING").map((r) => [r.departmentId, r.department])).values());
  const tabs = cfDepts.map((d) => {
    const deptRows = rows.filter((r) => r.departmentId === d.id);
    const clientSet = new Set<string>();
    core.resources.filter((r) => r.departmentId === d.id).forEach((r) => r.utilisationLogs.forEach((l) => clientSet.add(l.clientId)));
    const revenue = deptRows.reduce((s, r) => s + r.revenueAllottedInr, 0);
    const cost = deptRows.reduce((s, r) => s + r.costInr, 0);
    return {
      id: d.id, name: d.name,
      scorecard: {
        resources: deptRows.length, clients: clientSet.size, revenueInr: revenue, costInr: cost,
        marginInr: revenue - cost, avgUtilPct: deptRows.length ? deptRows.reduce((s, r) => s + r.utilisationPct, 0) / deptRows.length : 0,
      },
      rows: deptRows,
      tierServices: tiersByDept.get(d.id) ?? [],
    };
  });

  const allClientSet = new Set<string>();
  core.resources.forEach((r) => r.utilisationLogs.forEach((l) => allClientSet.add(l.clientId)));
  const revenue = rows.reduce((s, r) => s + r.revenueAllottedInr, 0);
  const cost = rows.reduce((s, r) => s + r.costInr, 0);
  const scorecard = {
    billableResources: rows.length,
    activeClients: allClientSet.size,
    revenueInr: revenue,
    costInr: cost,
    grossMarginInr: revenue - cost,
    avgUtilPct: rows.length ? rows.reduce((s, r) => s + r.utilisationPct, 0) / rows.length : 0,
    overCap: rows.filter((r) => r.status === "OVER_CAPACITY").length,
    underUtil: rows.filter((r) => r.status === "UNDER_UTILISED" || r.status === "SEVERELY_UNDER").length,
  };

  return NextResponse.json({ scorecard, tabs });
}
