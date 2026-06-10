import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/server/api";
import { getSystemConfig } from "@/lib/server/config";
import { computeClientWaterfall, currentPeriod } from "@/lib/server/metrics";
import {
  getServiceHours,
  getInvoiceHours,
  calculateUtilisation,
  DEFAULT_UTIL_TIERS,
} from "@/lib/engines/utilisationEngine";

const WRITE = ["ADMIN", "MANAGER", "FINANCE"];

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const sp = new URL(req.url).searchParams;
  const year = Number(sp.get("year")) || currentPeriod().year;
  const month = Number(sp.get("month")) || currentPeriod().month;

  const logs = await prisma.utilisationLog.findMany({
    where: { clientId: params.id, periodYear: year, periodMonth: month },
    include: { resource: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data: logs });
}

const schema = z.object({
  resourceId: z.string().min(1),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  dailyTxnVolume: z.number().min(0).default(0),
  routesRan: z.number().min(0).default(0),
  fleetInvoice: z.boolean().default(false),
  marshInvoice: z.boolean().default(false),
  adocHoursPerDay: z.number().min(0).default(0),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid utilisation payload");
  const d = parsed.data;

  const config = await getSystemConfig();

  const serviceHoursPerDay = getServiceHours(d.dailyTxnVolume, DEFAULT_UTIL_TIERS);
  const invoiceHoursPerDay = getInvoiceHours({
    routesRan: d.routesRan,
    fleetInvoice: d.fleetInvoice,
    marshInvoice: d.marshInvoice,
    routeThreshold: 50,
    belowThresholdHrs: 1.0,
    aboveThresholdHrs: 1.5,
    fleetAddOn: 0.5,
    marshAddOn: 0.5,
  });
  const util = calculateUtilisation({
    serviceHoursPerDay,
    invoiceHoursPerDay,
    adocHoursPerDay: d.adocHoursPerDay,
    availableHoursPerDay: config.available_hrs_per_day,
    workingDaysPerMonth: config.working_days_per_month,
  });

  // Revenue share: 50% of the client's net INR revenue split across billable
  // resources assigned to the client for the period.
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      services: { select: { monthlyFeeUsd: true, discountPct: true } },
      assignments: { include: { resource: { select: { isBillable: true } } } },
    },
  });
  let revenueShareInr = 0;
  if (client) {
    const wf = computeClientWaterfall(
      {
        startDate: client.startDate,
        endDate: client.endDate,
        billingType: client.billingType,
        paymentMethod: client.paymentMethod,
        services: client.services,
      },
      config,
      { year: d.periodYear, month: d.periodMonth }
    );
    const billableAssigned = new Set(
      client.assignments.filter((a) => a.resource.isBillable).map((a) => a.resourceId)
    ).size;
    revenueShareInr = billableAssigned > 0 ? (wf.netRevenueInr * 0.5) / billableAssigned : 0;
  }

  const log = await prisma.utilisationLog.upsert({
    where: {
      resourceId_clientId_periodYear_periodMonth: {
        resourceId: d.resourceId,
        clientId: params.id,
        periodYear: d.periodYear,
        periodMonth: d.periodMonth,
      },
    },
    update: {
      dailyTxnVolume: d.dailyTxnVolume,
      routesRan: d.routesRan,
      fleetInvoice: d.fleetInvoice,
      marshInvoice: d.marshInvoice,
      adocHoursPerDay: d.adocHoursPerDay,
      serviceHoursPerDay,
      invoiceHoursPerDay,
      totalHoursPerDay: util.totalHoursPerDay,
      utilisationPct: util.utilisationPct,
      monthlyHours: util.monthlyHours,
      revenueShareInr,
    },
    create: {
      resourceId: d.resourceId,
      clientId: params.id,
      periodYear: d.periodYear,
      periodMonth: d.periodMonth,
      dailyTxnVolume: d.dailyTxnVolume,
      routesRan: d.routesRan,
      fleetInvoice: d.fleetInvoice,
      marshInvoice: d.marshInvoice,
      adocHoursPerDay: d.adocHoursPerDay,
      serviceHoursPerDay,
      invoiceHoursPerDay,
      totalHoursPerDay: util.totalHoursPerDay,
      utilisationPct: util.utilisationPct,
      monthlyHours: util.monthlyHours,
      revenueShareInr,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "UtilisationLog", entityId: log.id, resourceId: d.resourceId, action: "UPSERT", after: log });
  return NextResponse.json({ data: log });
}
