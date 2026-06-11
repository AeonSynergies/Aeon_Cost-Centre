import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const costs = await prisma.resourceExtraCost.findMany({
    where: { resourceId: params.id },
    orderBy: { effectiveFrom: "desc" },
  });
  return NextResponse.json({ data: costs });
}

const schema = z.object({
  description: z.string().min(1),
  category: z.enum(["Training", "Equipment", "Travel", "Software", "Other"]),
  amountInr: z.number().min(0),
  frequency: z.enum(["MONTHLY", "ONE_TIME"]).default("MONTHLY"),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid extra cost payload");
  const d = parsed.data;

  const created = await prisma.resourceExtraCost.create({
    data: {
      resourceId: params.id,
      description: d.description,
      category: d.category,
      amountInr: d.amountInr,
      frequency: d.frequency,
      effectiveFrom: new Date(d.effectiveFrom),
      effectiveTo: d.effectiveTo ? new Date(d.effectiveTo) : null,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ResourceExtraCost", entityId: created.id, resourceId: params.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
