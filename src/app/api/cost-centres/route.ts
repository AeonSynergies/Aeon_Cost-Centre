import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeResourceCost, isResourceActive, currentPeriod, type Period } from "@/lib/metrics";

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

  const [ccs, expenses] = await Promise.all([
    prisma.costCentre.findMany({
      orderBy: { name: "asc" },
      include: {
        resources: { include: { revisions: true, costCentre: true, extraCosts: true } },
      },
    }),
    prisma.expense.groupBy({
      by: ["costCentreId"],
      where: { periodYear: period.year, periodMonth: period.month },
      _sum: { amountInr: true },
    }),
  ]);

  const expenseByCc = new Map<string, number>();
  for (const e of expenses) {
    if (e.costCentreId) expenseByCc.set(e.costCentreId, e._sum.amountInr ?? 0);
  }

  const data = ccs.map((c) => {
    const active = c.resources.filter((r) => isResourceActive(r, period));
    const resourceCostInr = active.reduce((s, r) => s + computeResourceCost(r, config, period).totalCostInr, 0);
    const departmentCount = new Set(c.resources.map((r) => r.departmentId)).size;
    const expensesInr = expenseByCc.get(c.id) ?? 0;
    const departmentCostsInr = 0; // dept-level allocation arrives with Phase 3
    return {
      id: c.id,
      name: c.name,
      departmentId: c.departmentId,
      resourceCount: active.length,
      departmentCount,
      expensesInr,
      resourceCostInr,
      departmentCostsInr,
      totalCostInr: expensesInr + resourceCostInr + departmentCostsInr,
    };
  });
  return NextResponse.json({ data });
}

const schema = z.object({
  name: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  ms365RateInr: z.number().min(0).default(0),
  zoomRateUsd: z.number().min(0).default(0),
});

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid cost centre payload");

  const created = await prisma.costCentre.create({
    data: {
      name: parsed.data.name,
      departmentId: parsed.data.departmentId || null,
      ms365RateInr: parsed.data.ms365RateInr,
      zoomRateUsd: parsed.data.zoomRateUsd,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "CostCentre", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
