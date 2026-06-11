import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeClientWaterfall } from "@/lib/metrics";
import { getServiceHours, getInvoiceHours, calculateUtilisation, DEFAULT_UTIL_TIERS } from "@/lib/engines/utilisationEngine";

const WRITE = ["ADMIN", "MANAGER", "FINANCE"];

const schema = z.object({
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  rows: z.array(z.object({
    clientId: z.string().min(1),
    dailyTxnVolume: z.number().min(0).default(0),
    routesRan: z.number().min(0).default(0),
    fleetInvoice: z.boolean().default(false),
    marshInvoice: z.boolean().default(false),
    adocHoursPerDay: z.number().min(0).default(0),
  })).default([]),
});

export async function POST(req: Request, { params }: { params: { resourceId: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid payload");
  const { periodYear, periodMonth, rows } = parsed.data;

  const config = await getSystemConfig();

  for (const row of rows) {
    const serviceHoursPerDay = getServiceHours(row.dailyTxnVolume, DEFAULT_UTIL_TIERS);
    const invoiceHoursPerDay = getInvoiceHours({ routesRan: row.routesRan, fleetInvoice: row.fleetInvoice, marshInvoice: row.marshInvoice, routeThreshold: 50, belowThresholdHrs: 1.0, aboveThresholdHrs: 1.5, fleetAddOn: 0.5, marshAddOn: 0.5 });
    const util = calculateUtilisation({ serviceHoursPerDay, invoiceHoursPerDay, adocHoursPerDay: row.adocHoursPerDay, availableHoursPerDay: config.available_hrs_per_day, workingDaysPerMonth: config.working_days_per_month });

    const client = await prisma.client.findUnique({ where: { id: row.clientId }, include: { services: { select: { monthlyFeeUsd: true, discountPct: true } }, assignments: { include: { resource: { select: { isBillable: true } } } } } });
    let revenueShareInr = 0;
    if (client) {
      const wf = computeClientWaterfall({ startDate: client.startDate, endDate: client.endDate, billingType: client.billingType, paymentMethod: client.paymentMethod, services: client.services }, config, { year: periodYear, month: periodMonth });
      const billableAssigned = new Set(client.assignments.filter((a) => a.resource.isBillable).map((a) => a.resourceId)).size;
      revenueShareInr = billableAssigned > 0 ? (wf.netRevenueInr * 0.5) / billableAssigned : 0;
    }

    await prisma.utilisationLog.upsert({
      where: { resourceId_clientId_periodYear_periodMonth: { resourceId: params.resourceId, clientId: row.clientId, periodYear, periodMonth } },
      update: { dailyTxnVolume: row.dailyTxnVolume, routesRan: row.routesRan, fleetInvoice: row.fleetInvoice, marshInvoice: row.marshInvoice, adocHoursPerDay: row.adocHoursPerDay, serviceHoursPerDay, invoiceHoursPerDay, totalHoursPerDay: util.totalHoursPerDay, utilisationPct: util.utilisationPct, monthlyHours: util.monthlyHours, revenueShareInr },
      create: { resourceId: params.resourceId, clientId: row.clientId, periodYear, periodMonth, dailyTxnVolume: row.dailyTxnVolume, routesRan: row.routesRan, fleetInvoice: row.fleetInvoice, marshInvoice: row.marshInvoice, adocHoursPerDay: row.adocHoursPerDay, serviceHoursPerDay, invoiceHoursPerDay, totalHoursPerDay: util.totalHoursPerDay, utilisationPct: util.utilisationPct, monthlyHours: util.monthlyHours, revenueShareInr },
    });
  }

  await writeAudit({ userId: u.user.id, entity: "UtilisationLog", entityId: params.resourceId, resourceId: params.resourceId, action: "SAVE", after: { count: rows.length } });
  return NextResponse.json({ ok: true });
}
