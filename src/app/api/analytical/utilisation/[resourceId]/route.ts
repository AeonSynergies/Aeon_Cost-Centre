import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeResourceCost, currentPeriod, type Period } from "@/lib/metrics";
import { calculateUtilisation } from "@/lib/engines/utilisationEngine";
import { isAssignmentActive } from "@/lib/analytics";

function periodFromQuery(url: string): Period {
  const sp = new URL(url).searchParams;
  const y = Number(sp.get("year"));
  const m = Number(sp.get("month"));
  if (y && m) return { year: y, month: m };
  return currentPeriod();
}

export async function GET(req: Request, { params }: { params: { resourceId: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const period = periodFromQuery(req.url);
  const config = await getSystemConfig();

  const resource = await prisma.resource.findUnique({
    where: { id: params.resourceId },
    include: {
      revisions: true, costCentre: true, extraCosts: true,
      department: { select: { id: true, name: true } },
      assignments: { include: { client: { select: { id: true, name: true } } } },
      utilisationLogs: { where: { periodYear: period.year, periodMonth: period.month } },
    },
  });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clientIds = Array.from(new Set(resource.assignments.filter((a) => isAssignmentActive(a, period)).map((a) => a.clientId)));
  const clientMap = new Map(resource.assignments.map((a) => [a.clientId, a.client.name]));
  const logByClient = new Map(resource.utilisationLogs.map((l) => [l.clientId, l]));

  const rows = clientIds.map((cid) => {
    const log = logByClient.get(cid);
    return {
      clientId: cid, client: clientMap.get(cid) ?? "",
      dailyTxnVolume: log?.dailyTxnVolume ?? 0, routesRan: log?.routesRan ?? 0,
      fleetInvoice: log?.fleetInvoice ?? false, marshInvoice: log?.marshInvoice ?? false,
      adocHoursPerDay: log?.adocHoursPerDay ?? 0,
      serviceHoursPerDay: log?.serviceHoursPerDay ?? 0, invoiceHoursPerDay: log?.invoiceHoursPerDay ?? 0,
      totalHoursPerDay: log?.totalHoursPerDay ?? 0, utilisationPct: log?.utilisationPct ?? 0,
      monthlyHours: log?.monthlyHours ?? 0, revenueShareInr: log?.revenueShareInr ?? 0,
      status: log?.status ?? "DRAFT",
    };
  });

  const serviceHrs = rows.reduce((s, r) => s + r.serviceHoursPerDay, 0);
  const invoiceHrs = rows.reduce((s, r) => s + r.invoiceHoursPerDay, 0);
  const adocHrs = rows.reduce((s, r) => s + r.adocHoursPerDay, 0);
  const util = calculateUtilisation({ serviceHoursPerDay: serviceHrs, invoiceHoursPerDay: invoiceHrs, adocHoursPerDay: adocHrs, availableHoursPerDay: config.available_hrs_per_day, workingDaysPerMonth: config.working_days_per_month });
  const cost = computeResourceCost(resource, config, period).totalCostInr;
  const revenue = rows.reduce((s, r) => s + r.revenueShareInr, 0);

  return NextResponse.json({
    resource: { id: resource.id, name: resource.name, department: resource.department.name, isBillable: resource.isBillable, status: resource.terminatedDate ? "TERMED" : "ACTIVE" },
    rows,
    summary: {
      totalHoursPerDay: util.totalHoursPerDay, utilisationPct: util.utilisationPct,
      monthlyRevenueInr: revenue, costInr: cost, grossMarginInr: revenue - cost,
      marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      status: rows.length ? rows[0].status : "DRAFT",
    },
  });
}
