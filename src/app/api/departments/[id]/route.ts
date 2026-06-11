import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeResourceCost, isResourceActive, computeClientWaterfall, currentPeriod, type Period } from "@/lib/metrics";
import { calculateDeptRevenueShare } from "@/lib/engines/revenueShareEngine";

const WRITE = ["ADMIN", "MANAGER"];
const CATEGORIES = ["CLIENT_FACING", "ADMINISTRATION", "BUSINESS_DEVELOPMENT", "INTERNAL", "SAAS_DEVELOPMENT"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  const period = periodFromQuery(req.url);
  const config = await getSystemConfig();

  const dept = await prisma.department.findUnique({
    where: { id: params.id },
    include: {
      head: { select: { id: true, name: true } },
      costCentres: { select: { id: true, name: true } },
      services: { select: { id: true, code: true, name: true, _count: { select: { activities: true, clientServices: true } } } },
      resources: {
        include: {
          revisions: true,
          costCentre: true,
          extraCosts: true,
          assignments: { include: { service: { select: { code: true } } } },
          utilisationLogs: { where: { periodYear: period.year, periodMonth: period.month } },
        },
      },
    },
  });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const deptResources = dept.resources;

  const serviceIds = new Set(dept.services.map((s) => s.id));

  // Clients that consume this department's services.
  const clients = await prisma.client.findMany({
    include: { services: { include: { service: { select: { id: true, code: true, departmentId: true } } } } },
  });

  // Attribute a client's net INR revenue across its services pro-rata by fee.
  function deptRevenueForPeriod(p: Period): number {
    let total = 0;
    for (const c of clients) {
      const totalFee = c.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
      if (totalFee <= 0) continue;
      const wf = computeClientWaterfall(
        { startDate: c.startDate, endDate: c.endDate, billingType: c.billingType, paymentMethod: c.paymentMethod, services: c.services },
        config,
        p
      );
      for (const cs of c.services) {
        if (serviceIds.has(cs.serviceId)) total += wf.netRevenueInr * (cs.monthlyFeeUsd / totalFee);
      }
    }
    return total;
  }

  function workforceCostForPeriod(p: Period): number {
    return deptResources
      .filter((r) => isResourceActive(r, p))
      .reduce((s, r) => s + computeResourceCost(r, config, p).totalCostInr, 0);
  }

  // Client-service revenue breakdown (selected period).
  const clientBreakdown: Array<Record<string, unknown>> = [];
  for (const c of clients) {
    const totalFee = c.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
    if (totalFee <= 0) continue;
    const wf = computeClientWaterfall(
      { startDate: c.startDate, endDate: c.endDate, billingType: c.billingType, paymentMethod: c.paymentMethod, services: c.services },
      config,
      period
    );
    for (const cs of c.services) {
      if (!serviceIds.has(cs.serviceId)) continue;
      const net = wf.netRevenueInr * (cs.monthlyFeeUsd / totalFee);
      clientBreakdown.push({
        clientId: c.id,
        client: c.name,
        serviceCode: cs.service.code,
        packageType: cs.packageType,
        monthlyFeeUsd: cs.monthlyFeeUsd,
        netRevenueInr: net,
        deptShareInr: calculateDeptRevenueShare(net),
        period: `${MONTHS[period.month - 1]} ${period.year}`,
        status: c.endDate && new Date(c.endDate) < new Date() ? "CHURNED" : "ACTIVE",
      });
    }
  }

  // Monthly P&L for the period's year.
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const p = { year: period.year, month: i + 1 };
    const revenue = deptRevenueForPeriod(p);
    const workforce = workforceCostForPeriod(p);
    const reserve = calculateDeptRevenueShare(revenue);
    return {
      month: MONTHS[i],
      revenueInr: revenue,
      reserveInr: reserve,
      workforceCostInr: workforce,
      toolCostInr: 0,
      totalCostInr: workforce,
      surplusInr: reserve - workforce,
    };
  });

  const revenueInr = deptRevenueForPeriod(period);
  const workforceCostInr = workforceCostForPeriod(period);
  const deptReserveInr = calculateDeptRevenueShare(revenueInr);

  const resources = dept.resources.map((r) => {
    const cost = computeResourceCost(r, config, period);
    const active = isResourceActive(r, period);
    const latest = [...r.revisions].sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
    const codes = Array.from(new Set(r.assignments.map((a) => a.service.code)));
    const util = r.utilisationLogs.length
      ? r.utilisationLogs.reduce((s, l) => s + l.utilisationPct, 0) / r.utilisationLogs.length
      : 0;
    return {
      id: r.id,
      name: r.name,
      title: r.title,
      costCentre: r.costCentre.name,
      isBillable: r.isBillable,
      services: codes,
      baseSalary: latest?.baseSalary ?? 0,
      totalCostInr: cost.totalCostInr,
      utilisationPct: util,
      status: active ? "ACTIVE" : "TERMED",
    };
  });

  return NextResponse.json({
    data: {
      id: dept.id,
      name: dept.name,
      category: dept.category,
      head: dept.head,
      costCentres: dept.costCentres,
      services: dept.services.map((s) => ({ id: s.id, code: s.code, name: s.name, activities: s._count.activities, activeClients: s._count.clientServices })),
      resources,
      pnl: {
        kpi: {
          revenueInr,
          deptReserveInr,
          workforceCostInr,
          totalDeptCostInr: workforceCostInr,
          surplusInr: deptReserveInr - workforceCostInr,
        },
        clientBreakdown,
        monthly,
      },
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(CATEGORIES).optional(),
  headId: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid department payload");

  const before = await prisma.department.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.department.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.headId !== undefined ? { headId: parsed.data.headId || null } : {}),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "Department", entityId: updated.id, action: "UPDATE", before, after: updated });
  return NextResponse.json({ data: updated });
}
