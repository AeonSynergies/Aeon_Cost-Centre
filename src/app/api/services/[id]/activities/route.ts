import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/server/api";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const activities = await prisma.serviceActivity.findMany({
    where: { serviceId: params.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: activities });
}

const schema = z.object({
  name: z.string().min(1),
  defaultExpectedHoursPerDay: z.number().min(0).default(0),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid activity payload");

  const created = await prisma.serviceActivity.create({
    data: {
      serviceId: params.id,
      name: parsed.data.name,
      defaultExpectedHoursPerDay: parsed.data.defaultExpectedHoursPerDay,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ServiceActivity", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
