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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const period = periodFromQuery(req.url);
  const config = await getSystemConfig();

  const cc = await prisma.costCentre.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { id: true, name: true } },
      resources: {
        include: { revisions: true, costCentre: true, extraCosts: true, department: { select: { id: true, name: true, category: true } } },
      },
    },
  });
  if (!cc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expenses = await prisma.expense.findMany({
    where: { costCentreId: params.id, periodYear: period.year, periodMonth: period.month },
    orderBy: { createdAt: "desc" },
  });

  const resources = cc.resources.map((r) => {
    const cost = computeResourceCost(r, config, period);
    const active = isResourceActive(r, period);
    const latest = [...r.revisions].sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
    return {
      id: r.id,
      name: r.name,
      title: r.title,
      department: r.department,
      isBillable: r.isBillable,
      baseSalary: latest?.baseSalary ?? 0,
      totalCostInr: cost.totalCostInr,
      status: active ? "ACTIVE" : "TERMED",
      active,
    };
  });

  // Departments rolled up from the resources in this cost centre.
  const deptMap = new Map<string, { id: string; name: string; category: string; resourceCount: number; costInr: number }>();
  for (const r of resources) {
    if (!r.active) continue;
    const d = cc.resources.find((x) => x.id === r.id)!.department;
    const cur = deptMap.get(d.id) ?? { id: d.id, name: d.name, category: d.category, resourceCount: 0, costInr: 0 };
    cur.resourceCount += 1;
    cur.costInr += r.totalCostInr;
    deptMap.set(d.id, cur);
  }

  const activeResources = resources.filter((r) => r.active);
  const resourceCostInr = activeResources.reduce((s, r) => s + r.totalCostInr, 0);
  const expensesInr = expenses.reduce((s, e) => s + (e.amountInr ?? 0), 0);

  return NextResponse.json({
    data: {
      id: cc.id,
      name: cc.name,
      resources,
      departments: Array.from(deptMap.values()),
      expenses,
      kpi: {
        resourceCount: activeResources.length,
        departmentCount: deptMap.size,
        expensesInr,
        resourceCostInr,
        totalCostInr: expensesInr + resourceCostInr,
      },
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  departmentId: z.string().nullable().optional(),
  ms365RateInr: z.number().min(0).optional(),
  zoomRateUsd: z.number().min(0).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid cost centre payload");

  const before = await prisma.costCentre.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = parsed.data;
  const updated = await prisma.costCentre.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.departmentId !== undefined ? { departmentId: d.departmentId || null } : {}),
      ...(d.ms365RateInr !== undefined ? { ms365RateInr: d.ms365RateInr } : {}),
      ...(d.zoomRateUsd !== undefined ? { zoomRateUsd: d.zoomRateUsd } : {}),
    },
  });
  await writeAudit({
    userId: u.user.id,
    entity: "CostCentre",
    entityId: updated.id,
    action: "UPDATE",
    before,
    after: updated,
  });
  return NextResponse.json({ data: updated });
}
