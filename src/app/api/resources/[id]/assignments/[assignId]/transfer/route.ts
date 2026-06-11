import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const schema = z.object({
  toResourceId: z.string().min(1),
  effectiveDate: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string; assignId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid transfer payload");
  const { toResourceId, effectiveDate, notes } = parsed.data;

  const current = await prisma.resourceAssignment.findUnique({ where: { id: params.assignId } });
  if (!current) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const effective = new Date(effectiveDate);
  const dayBefore = new Date(effective.getTime() - 24 * 60 * 60 * 1000);

  const [, created] = await prisma.$transaction([
    prisma.resourceAssignment.update({
      where: { id: current.id },
      data: { assignedTo: dayBefore },
    }),
    prisma.resourceAssignment.create({
      data: {
        resourceId: toResourceId,
        clientId: current.clientId,
        serviceId: current.serviceId,
        assignedFrom: effective,
        assignedTo: null,
      },
    }),
  ]);

  await writeAudit({
    userId: u.user.id,
    entity: "ResourceAssignment",
    entityId: current.id,
    resourceId: params.id,
    action: "TRANSFER",
    before: current,
    after: { transferredTo: toResourceId, effectiveDate, newAssignmentId: created.id, notes },
  });

  const target = await prisma.resource.findUnique({ where: { id: toResourceId }, select: { name: true } });
  return NextResponse.json({ data: created, message: `Assignment transferred to ${target?.name ?? "resource"} from ${effectiveDate}` });
}
