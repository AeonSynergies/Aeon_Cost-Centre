import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const ccs = await prisma.costCentre.findMany({
    orderBy: { name: "asc" },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { resources: true } },
    },
  });

  const data = ccs.map((c) => ({
    id: c.id,
    name: c.name,
    departmentId: c.departmentId,
    departmentName: c.department?.name ?? null,
    ms365RateInr: c.ms365RateInr,
    zoomRateUsd: c.zoomRateUsd,
    resourceCount: c._count.resources,
  }));
  return NextResponse.json({ data });
}

const schema = z.object({
  name: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  ms365RateInr: z.number().min(0),
  zoomRateUsd: z.number().min(0),
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
  await writeAudit({
    userId: u.user.id,
    entity: "CostCentre",
    entityId: created.id,
    action: "CREATE",
    after: created,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
