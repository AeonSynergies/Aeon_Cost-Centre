import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const revisions = await prisma.resourceRevision.findMany({
    where: { resourceId: params.id },
    orderBy: { effectiveFrom: "desc" },
  });
  return NextResponse.json({ data: revisions });
}

const schema = z.object({
  effectiveFrom: z.string().min(1),
  baseSalary: z.number().min(0),
  incentive: z.number().min(0).default(0),
  allowance: z.number().min(0).default(0),
  workingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  dailyWorkHours: z.number().min(0).default(8),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid revision payload");
  const d = parsed.data;

  const created = await prisma.resourceRevision.create({
    data: {
      resourceId: params.id,
      effectiveFrom: new Date(d.effectiveFrom),
      baseSalary: d.baseSalary,
      incentive: d.incentive,
      allowance: d.allowance,
      workingDays: d.workingDays,
      dailyWorkHours: d.dailyWorkHours,
      changedById: u.user.id,
    },
  });
  await writeAudit({
    userId: u.user.id,
    entity: "ResourceRevision",
    entityId: created.id,
    resourceId: params.id,
    action: "CREATE",
    after: created,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
