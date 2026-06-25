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

  const resource = await prisma.resource.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { id: true, name: true } },
      headOfDept: { select: { id: true, name: true } },
      costCentre: { select: { id: true, name: true, ms365RateInr: true, zoomRateUsd: true } },
      revisions: { orderBy: { effectiveFrom: "desc" } },
      assets: { orderBy: { issueDate: "desc" } },
      extraCosts: { orderBy: { effectiveFrom: "desc" } },
      assignments: {
        include: {
          client: { select: { id: true, name: true } },
          service: { select: { id: true, code: true, name: true, departmentId: true } },
        },
        orderBy: { assignedFrom: "desc" },
      },
      utilisationLogs: { where: { periodYear: period.year, periodMonth: period.month } },
    },
  });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await getSystemConfig();
  const cost = computeResourceCost(resource, config, period);
  const active = isResourceActive(resource, period);
  const SENTINEL = new Date(2026, 11, 31).getTime();
  const isTermed = !!resource.terminatedDate && resource.terminatedDate.getTime() !== SENTINEL && resource.terminatedDate < new Date();

  // Per-client utilisation% for the period (used in the Assignments tab).
  const utilByClient: Record<string, number> = {};
  for (const l of resource.utilisationLogs) utilByClient[l.clientId] = (utilByClient[l.clientId] ?? 0) + l.utilisationPct;

  return NextResponse.json({
    data: { ...resource, active, status: isTermed ? "TERMED" : "ACTIVE" },
    cost,
    utilByClient,
  });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  costCentreId: z.string().min(1).optional(),
  isBillable: z.boolean().optional(),
  laptopCostInr: z.number().min(0).nullable().optional(),
  laptopIssueDate: z.string().nullable().optional(),
  overheadManual: z.number().min(0).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid resource payload");
  const d = parsed.data;

  const before = await prisma.resource.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.resource.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.departmentId !== undefined ? { departmentId: d.departmentId } : {}),
      ...(d.costCentreId !== undefined ? { costCentreId: d.costCentreId } : {}),
      ...(d.isBillable !== undefined ? { isBillable: d.isBillable } : {}),
      ...(d.laptopCostInr !== undefined ? { laptopCostInr: d.laptopCostInr } : {}),
      ...(d.laptopIssueDate !== undefined
        ? { laptopIssueDate: d.laptopIssueDate ? new Date(d.laptopIssueDate) : null }
        : {}),
      ...(d.overheadManual !== undefined ? { overheadManual: d.overheadManual } : {}),
    },
  });
  await writeAudit({
    userId: u.user.id,
    entity: "Resource",
    entityId: updated.id,
    resourceId: updated.id,
    action: "UPDATE",
    before,
    after: updated,
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const resource = await prisma.resource.findUnique({ where: { id: params.id } });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const SENTINEL = new Date(2026, 11, 31).getTime();
  const isTermed = !!resource.terminatedDate && resource.terminatedDate.getTime() !== SENTINEL;
  if (!isTermed) return badRequest("Only terminated resources can be deleted");

  // Remove dependent records first (no DB-level cascade configured).
  await prisma.$transaction([
    prisma.utilisationLog.deleteMany({ where: { resourceId: params.id } }),
    prisma.resourceAssignment.deleteMany({ where: { resourceId: params.id } }),
    prisma.resourceAsset.deleteMany({ where: { resourceId: params.id } }),
    prisma.resourceExtraCost.deleteMany({ where: { resourceId: params.id } }),
    prisma.resourceRevision.deleteMany({ where: { resourceId: params.id } }),
    prisma.auditLog.deleteMany({ where: { resourceId: params.id } }),
    prisma.resource.delete({ where: { id: params.id } }),
  ]);
  await writeAudit({ userId: u.user.id, entity: "Resource", entityId: params.id, action: "DELETE", before: resource });
  return NextResponse.json({ ok: true });
}
