import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  category: z.enum(["Training", "Equipment", "Travel", "Software", "Other"]).optional(),
  amountInr: z.number().min(0).optional(),
  frequency: z.enum(["MONTHLY", "ONE_TIME"]).optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string; costId: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid extra cost payload");
  const d = parsed.data;

  const updated = await prisma.resourceExtraCost.update({
    where: { id: params.costId },
    data: {
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.amountInr !== undefined ? { amountInr: d.amountInr } : {}),
      ...(d.frequency !== undefined ? { frequency: d.frequency } : {}),
      ...(d.effectiveFrom !== undefined ? { effectiveFrom: new Date(d.effectiveFrom) } : {}),
      ...(d.effectiveTo !== undefined ? { effectiveTo: d.effectiveTo ? new Date(d.effectiveTo) : null } : {}),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ResourceExtraCost", entityId: updated.id, resourceId: params.id, action: "UPDATE", after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string; costId: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  await prisma.resourceExtraCost.delete({ where: { id: params.costId } });
  await writeAudit({ userId: u.user.id, entity: "ResourceExtraCost", entityId: params.costId, resourceId: params.id, action: "DELETE" });
  return NextResponse.json({ ok: true });
}
