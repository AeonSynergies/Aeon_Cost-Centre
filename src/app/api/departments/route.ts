import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig, ratesFromConfig } from "@/lib/config";
import {
  computeResourceCost,
  isResourceActive,
  perServiceNetRevenueInr,
  currentPeriod,
  type Period,
} from "@/lib/metrics";
import { calculateDeptRevenueShare } from "@/lib/engines/revenueShareEngine";
import { inrToUsdDisplay } from "@/lib/engines/currencyEngine";

const WRITE = ["ADMIN", "MANAGER"];

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

  const period = periodFromQuery(req.url);
  const config = await getSystemConfig();
  const rates = ratesFromConfig(config);

  const [departments, clients] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        head: { select: { id: true, name: true } },
        services: { select: { id: true, code: true } },
        resources: {
          include: { revisions: true, costCentre: true, extraCosts: true },
        },
      },
    }),
    prisma.client.findMany({
      include: { services: { select: { serviceId: true, monthlyFeeUsd: true, discountPct: true } } },
    }),
  ]);

  const svcRevenue = perServiceNetRevenueInr(
    clients.map((c) => ({
      startDate: c.startDate,
      endDate: c.endDate,
      billingType: c.billingType,
      paymentMethod: c.paymentMethod,
      services: c.services,
    })),
    config,
    period
  );

  const data = departments.map((d) => {
    const activeResources = d.resources.filter((r) => isResourceActive(r, period));
    const monthlyCostInr = activeResources.reduce(
      (s, r) => s + computeResourceCost(r, config, period).totalCostInr,
      0
    );
    const revenueInr = d.services.reduce((s, svc) => s + (svcRevenue.get(svc.id) ?? 0), 0);
    const deptReserveInr = calculateDeptRevenueShare(revenueInr);
    const surplusInr = deptReserveInr - monthlyCostInr;

    return {
      id: d.id,
      name: d.name,
      category: d.category,
      headName: d.head?.name ?? null,
      activeResourceCount: activeResources.length,
      services: d.services.map((s) => s.code),
      revenueInr,
      deptReserveInr,
      monthlyCostInr,
      monthlyCostUsd: inrToUsdDisplay(monthlyCostInr, rates.rateD, 0),
      surplusInr,
      surplusUsd: inrToUsdDisplay(surplusInr, rates.rateD, 0),
    };
  });

  return NextResponse.json({ data });
}

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["CLIENT_FACING", "ADMINISTRATION", "BUSINESS_DEVELOPMENT", "INTERNAL", "SAAS_DEVELOPMENT"]),
  headId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid department payload");

  const created = await prisma.department.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      headId: parsed.data.headId || null,
    },
  });
  await writeAudit({
    userId: u.user.id,
    entity: "Department",
    entityId: created.id,
    action: "CREATE",
    after: created,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
