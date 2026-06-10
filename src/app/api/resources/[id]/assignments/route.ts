import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/server/api";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const assignments = await prisma.resourceAssignment.findMany({
    where: { resourceId: params.id },
    include: {
      client: { select: { id: true, name: true } },
      service: { select: { id: true, code: true, name: true, departmentId: true } },
    },
    orderBy: { assignedFrom: "desc" },
  });
  return NextResponse.json({ data: assignments });
}

const schema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  assignedFrom: z.string().min(1),
  assignedTo: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid assignment payload");
  const d = parsed.data;

  const created = await prisma.resourceAssignment.create({
    data: {
      resourceId: params.id,
      clientId: d.clientId,
      serviceId: d.serviceId,
      assignedFrom: new Date(d.assignedFrom),
      assignedTo: d.assignedTo ? new Date(d.assignedTo) : null,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ResourceAssignment", entityId: created.id, resourceId: params.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
