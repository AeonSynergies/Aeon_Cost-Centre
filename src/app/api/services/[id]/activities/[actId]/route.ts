import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  defaultExpectedHoursPerDay: z.number().min(0).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; actId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid activity payload");

  const updated = await prisma.serviceActivity.update({
    where: { id: params.actId },
    data: parsed.data,
  });
  await writeAudit({ userId: u.user.id, entity: "ServiceActivity", entityId: updated.id, action: "UPDATE", after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; actId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  await prisma.serviceActivity.delete({ where: { id: params.actId } });
  await writeAudit({ userId: u.user.id, entity: "ServiceActivity", entityId: params.actId, action: "DELETE" });
  return NextResponse.json({ ok: true });
}
