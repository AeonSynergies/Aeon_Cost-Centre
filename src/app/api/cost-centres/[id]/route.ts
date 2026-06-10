import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const cc = await prisma.costCentre.findUnique({
    where: { id: params.id },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!cc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: cc });
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
