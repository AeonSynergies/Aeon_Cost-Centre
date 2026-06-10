import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const patchSchema = z.object({
  clientId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  assignedFrom: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; assignId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid assignment payload");
  const d = parsed.data;

  const updated = await prisma.resourceAssignment.update({
    where: { id: params.assignId },
    data: {
      ...(d.clientId !== undefined ? { clientId: d.clientId } : {}),
      ...(d.serviceId !== undefined ? { serviceId: d.serviceId } : {}),
      ...(d.assignedFrom !== undefined ? { assignedFrom: new Date(d.assignedFrom) } : {}),
      ...(d.assignedTo !== undefined ? { assignedTo: d.assignedTo ? new Date(d.assignedTo) : null } : {}),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ResourceAssignment", entityId: updated.id, resourceId: params.id, action: "UPDATE", after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; assignId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  await prisma.resourceAssignment.delete({ where: { id: params.assignId } });
  await writeAudit({ userId: u.user.id, entity: "ResourceAssignment", entityId: params.assignId, resourceId: params.id, action: "DELETE" });
  return NextResponse.json({ ok: true });
}
