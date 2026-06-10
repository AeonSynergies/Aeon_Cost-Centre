import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const dept = await prisma.department.findUnique({
    where: { id: params.id },
    include: {
      head: { select: { id: true, name: true } },
      services: { select: { id: true, code: true, name: true } },
      costCentres: { select: { id: true, name: true } },
      resources: {
        select: { id: true, name: true, title: true, isBillable: true, terminatedDate: true },
      },
    },
  });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: dept });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["CLIENT_FACING", "BUSINESS_DEVELOPMENT", "PRODUCT_DEVELOPMENT"]).optional(),
  headId: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid department payload");

  const before = await prisma.department.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.department.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.headId !== undefined ? { headId: parsed.data.headId || null } : {}),
    },
  });
  await writeAudit({
    userId: u.user.id,
    entity: "Department",
    entityId: updated.id,
    action: "UPDATE",
    before,
    after: updated,
  });
  return NextResponse.json({ data: updated });
}
