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

  const resources = await prisma.resource.findMany({
    orderBy: { employeeNumber: "asc" },
    include: {
      department: { select: { id: true, name: true } },
      costCentre: { select: { id: true, name: true, ms365RateInr: true, zoomRateUsd: true } },
      revisions: true,
    },
  });

  const data = resources.map((r) => {
    const cost = computeResourceCost(r, config, period);
    const active = isResourceActive(r, period);
    const latestRev = [...r.revisions].sort(
      (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime()
    )[0];
    return {
      id: r.id,
      employeeNumber: r.employeeNumber,
      name: r.name,
      title: r.title,
      departmentId: r.departmentId,
      departmentName: r.department.name,
      costCentreName: r.costCentre.name,
      isBillable: r.isBillable,
      joinedDate: r.joinedDate,
      terminatedDate: r.terminatedDate,
      active,
      status: active ? "ACTIVE" : "TERMED",
      workingDays: latestRev?.workingDays ?? [1, 2, 3, 4, 5],
      totalCostInr: cost.totalCostInr,
      totalCostUsd: cost.totalCostUsd,
    };
  });

  const summary = {
    total: data.length,
    active: data.filter((d) => d.active).length,
    billable: data.filter((d) => d.isBillable).length,
    totalCostInr: data.reduce((s, d) => s + d.totalCostInr, 0),
    fullyLoadedInr: data.filter((d) => d.active).reduce((s, d) => s + d.totalCostInr, 0),
  };

  return NextResponse.json({ data, summary });
}

const createSchema = z.object({
  employeeNumber: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  departmentId: z.string().min(1),
  costCentreId: z.string().min(1),
  joinedDate: z.string().min(1),
  isBillable: z.boolean().default(false),
  workingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  dailyWorkHours: z.number().min(0).default(8),
  baseSalary: z.number().min(0),
  incentive: z.number().min(0).default(0),
  allowance: z.number().min(0).default(0),
  effectiveFrom: z.string().optional(),
});

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid resource payload");
  const d = parsed.data;

  const created = await prisma.resource.create({
    data: {
      employeeNumber: d.employeeNumber,
      name: d.name,
      title: d.title,
      departmentId: d.departmentId,
      costCentreId: d.costCentreId,
      joinedDate: new Date(d.joinedDate),
      isBillable: d.isBillable,
      revisions: {
        create: {
          effectiveFrom: new Date(d.effectiveFrom || d.joinedDate),
          baseSalary: d.baseSalary,
          incentive: d.incentive,
          allowance: d.allowance,
          workingDays: d.workingDays,
          dailyWorkHours: d.dailyWorkHours,
          changedById: u.user.id,
        },
      },
    },
  });
  await writeAudit({
    userId: u.user.id,
    entity: "Resource",
    entityId: created.id,
    resourceId: created.id,
    action: "CREATE",
    after: created,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
