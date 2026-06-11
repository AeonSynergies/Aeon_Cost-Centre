import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const patchSchema = z.object({
  effectiveFrom: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  incentive: z.number().min(0).optional(),
  allowance: z.number().min(0).optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).optional(),
  dailyWorkHours: z.number().min(0).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string; revisionId: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid revision payload");
  const d = parsed.data;

  const updated = await prisma.resourceRevision.update({
    where: { id: params.revisionId },
    data: {
      ...(d.effectiveFrom !== undefined ? { effectiveFrom: new Date(d.effectiveFrom) } : {}),
      ...(d.baseSalary !== undefined ? { baseSalary: d.baseSalary } : {}),
      ...(d.incentive !== undefined ? { incentive: d.incentive } : {}),
      ...(d.allowance !== undefined ? { allowance: d.allowance } : {}),
      ...(d.workingDays !== undefined ? { workingDays: d.workingDays } : {}),
      ...(d.dailyWorkHours !== undefined ? { dailyWorkHours: d.dailyWorkHours } : {}),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ResourceRevision", entityId: updated.id, resourceId: params.id, action: "UPDATE", after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string; revisionId: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  await prisma.resourceRevision.delete({ where: { id: params.revisionId } });
  await writeAudit({ userId: u.user.id, entity: "ResourceRevision", entityId: params.revisionId, resourceId: params.id, action: "DELETE" });
  return NextResponse.json({ ok: true });
}
