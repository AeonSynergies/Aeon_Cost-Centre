import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const services = await prisma.clientService.findMany({
    where: { clientId: params.id },
    include: { service: { select: { id: true, code: true, name: true } } },
  });
  return NextResponse.json({ data: services });
}

const schema = z.object({
  serviceId: z.string().min(1),
  packageType: z.enum(["LESS_THAN_25", "MORE_THAN_25"]),
  monthlyFeeUsd: z.number().min(0),
  discountMode: z.enum(["PER_SERVICE", "PER_PACKAGE", "TOTAL"]).default("PER_PACKAGE"),
  discountPct: z.number().min(0).max(100).default(0),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid client service payload");
  const d = parsed.data;

  const created = await prisma.clientService.create({
    data: {
      clientId: params.id,
      serviceId: d.serviceId,
      packageType: d.packageType,
      monthlyFeeUsd: d.monthlyFeeUsd,
      discountMode: d.discountMode,
      discountPct: d.discountPct,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ClientService", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
