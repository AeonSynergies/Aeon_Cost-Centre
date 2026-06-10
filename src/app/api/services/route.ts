import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/server/api";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const services = await prisma.service.findMany({
    orderBy: { code: "asc" },
    include: {
      department: { select: { id: true, name: true } },
      costCentre: { select: { id: true, name: true } },
      packages: { orderBy: { packageType: "asc" } },
      _count: { select: { activities: true, clientServices: true } },
    },
  });

  const data = services.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    departmentId: s.departmentId,
    departmentName: s.department?.name ?? null,
    costCentreId: s.costCentreId,
    costCentreName: s.costCentre?.name ?? null,
    activeClients: s._count.clientServices,
    activityCount: s._count.activities,
    packages: s.packages.map((p) => ({
      id: p.id,
      serviceId: p.serviceId,
      packageType: p.packageType,
      monthlyFeeUsd: p.monthlyFeeUsd,
      effectiveFrom: p.effectiveFrom,
    })),
  }));
  return NextResponse.json({ data });
}

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  departmentId: z.string().min(1),
  costCentreId: z.string().min(1),
  description: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid service payload");

  const created = await prisma.service.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      departmentId: parsed.data.departmentId,
      costCentreId: parsed.data.costCentreId,
      description: parsed.data.description || null,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "Service", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
