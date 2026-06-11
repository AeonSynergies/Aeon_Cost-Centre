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

const putSchema = z.object({ services: z.array(schema).default([]) });

/** Replace all of a client's services in one shot (upsert/create/delete). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid client services payload");

  await prisma.$transaction([
    prisma.clientService.deleteMany({ where: { clientId: params.id } }),
    prisma.clientService.createMany({
      data: parsed.data.services.map((s) => ({
        clientId: params.id,
        serviceId: s.serviceId,
        packageType: s.packageType,
        monthlyFeeUsd: s.monthlyFeeUsd,
        discountMode: s.discountMode,
        discountPct: s.discountPct,
      })),
    }),
  ]);
  await writeAudit({ userId: u.user.id, entity: "ClientService", entityId: params.id, action: "REPLACE_ALL", after: parsed.data.services });
  return NextResponse.json({ ok: true });
}

