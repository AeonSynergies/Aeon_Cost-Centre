import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig, ratesFromConfig } from "@/lib/config";
import { computeClientWaterfall, currentPeriod, type Period } from "@/lib/metrics";
import { usdToInrRevenue } from "@/lib/engines/currencyEngine";

const WRITE = ["ADMIN", "MANAGER"];

function periodFromQuery(url: string): Period {
  const sp = new URL(url).searchParams;
  const y = Number(sp.get("year"));
  const m = Number(sp.get("month"));
  if (y && m) return { year: y, month: m };
  return currentPeriod();
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      services: {
        include: { service: { select: { id: true, code: true, name: true, departmentId: true, department: { select: { name: true } } } } },
      },
      billingRecords: { orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }] },
      assignments: {
        include: {
          resource: { select: { id: true, name: true, isBillable: true } },
          service: { select: { id: true, code: true, name: true } },
        },
      },
      utilisationLogs: {
        include: { resource: { select: { id: true, name: true } } },
      },
      expenses: { orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }] },
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await getSystemConfig();
  const rates = ratesFromConfig(config);
  const period = periodFromQuery(req.url);

  const wf = computeClientWaterfall(
    {
      startDate: client.startDate,
      endDate: client.endDate,
      billingType: client.billingType,
      paymentMethod: client.paymentMethod,
      txnFeeEnabled: client.txnFeeEnabled,
      services: client.services.map((s) => ({ monthlyFeeUsd: s.monthlyFeeUsd, discountPct: s.discountPct })),
    },
    config,
    period
  );
  const monthlyFeeUsd = client.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);

  return NextResponse.json({
    data: client,
    metrics: {
      monthlyFeeUsd,
      monthlyFeeInr: usdToInrRevenue(monthlyFeeUsd, rates.rateA),
      waterfall: wf,
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  paymentMethod: z.enum(["CARD", "ACH"]).optional(),
  billingType: z.enum(["LEGACY", "NEW"]).optional(),
  txnFeeEnabled: z.boolean().optional(),
  driverBand: z.string().nullable().optional(),
  vanBand: z.string().nullable().optional(),
  routeBand: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid client payload");
  const d = parsed.data;

  const before = await prisma.client.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.startDate !== undefined ? { startDate: new Date(d.startDate) } : {}),
      ...(d.endDate !== undefined ? { endDate: d.endDate ? new Date(d.endDate) : null } : {}),
      ...(d.paymentMethod !== undefined ? { paymentMethod: d.paymentMethod } : {}),
      ...(d.billingType !== undefined ? { billingType: d.billingType } : {}),
      ...(d.txnFeeEnabled !== undefined ? { txnFeeEnabled: d.txnFeeEnabled } : {}),
      ...(d.driverBand !== undefined ? { driverBand: d.driverBand || null } : {}),
      ...(d.vanBand !== undefined ? { vanBand: d.vanBand || null } : {}),
      ...(d.routeBand !== undefined ? { routeBand: d.routeBand || null } : {}),
    },
  });
  // Auto-trigger: when a client is given an end date, close its active
  // assignments on that date.
  if (d.endDate !== undefined && updated.endDate) {
    await prisma.resourceAssignment.updateMany({
      where: {
        clientId: params.id,
        OR: [{ assignedTo: null }, { assignedTo: { gt: updated.endDate } }],
      },
      data: { assignedTo: updated.endDate },
    });
  }

  await writeAudit({ userId: u.user.id, entity: "Client", entityId: updated.id, action: "UPDATE", before, after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const SENTINEL = new Date(2026, 11, 31).getTime();
  const churned = !!client.endDate && client.endDate.getTime() !== SENTINEL && client.endDate < new Date();
  if (!churned) return badRequest("Only churned clients can be deleted");

  const services = await prisma.clientService.findMany({ where: { clientId: params.id }, select: { id: true } });
  const serviceIds = services.map((s) => s.id);
  await prisma.$transaction([
    prisma.clientServiceRevision.deleteMany({ where: { clientServiceId: { in: serviceIds } } }),
    prisma.utilisationLog.deleteMany({ where: { clientId: params.id } }),
    prisma.activityClientOverride.deleteMany({ where: { clientId: params.id } }),
    prisma.resourceAssignment.deleteMany({ where: { clientId: params.id } }),
    prisma.billingRecord.deleteMany({ where: { clientId: params.id } }),
    prisma.expense.deleteMany({ where: { clientId: params.id } }),
    prisma.clientService.deleteMany({ where: { clientId: params.id } }),
    prisma.client.delete({ where: { id: params.id } }),
  ]);
  await writeAudit({ userId: u.user.id, entity: "Client", entityId: params.id, action: "DELETE", before: client });
  return NextResponse.json({ ok: true });
}
