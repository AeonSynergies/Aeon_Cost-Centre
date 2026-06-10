import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const service = await prisma.service.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { id: true, name: true } },
      costCentre: { select: { id: true, name: true } },
      packages: { orderBy: { packageType: "asc" } },
      activities: { orderBy: { name: "asc" } },
      clientServices: {
        include: { client: { select: { id: true, name: true, endDate: true } } },
      },
    },
  });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: service });
}

const patchSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  costCentreId: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid service payload");

  const before = await prisma.service.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = parsed.data;
  const updated = await prisma.service.update({
    where: { id: params.id },
    data: {
      ...(d.code !== undefined ? { code: d.code } : {}),
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.departmentId !== undefined ? { departmentId: d.departmentId } : {}),
      ...(d.costCentreId !== undefined ? { costCentreId: d.costCentreId } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "Service", entityId: updated.id, action: "UPDATE", before, after: updated });
  return NextResponse.json({ data: updated });
}
