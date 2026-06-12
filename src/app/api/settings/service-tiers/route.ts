import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, badRequest } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

const ADMIN = ["ADMIN"];

/** Returns every service with its currently-effective utilisation tiers (latest row per tierNumber). */
export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const services = await prisma.service.findMany({
    select: {
      id: true, code: true, name: true,
      utilisationTiers: { orderBy: [{ tierNumber: "asc" }, { effectiveFrom: "desc" }] },
    },
    orderBy: { code: "asc" },
  });

  const data = services.map((s) => {
    const seen = new Set<number>();
    const tiers: { tierNumber: number; maxTxnVolume: number; hoursPerDay: number; effectiveFrom: Date }[] = [];
    for (const t of s.utilisationTiers) {
      if (seen.has(t.tierNumber)) continue;
      seen.add(t.tierNumber);
      tiers.push({ tierNumber: t.tierNumber, maxTxnVolume: t.maxTxnVolume, hoursPerDay: t.hoursPerDay, effectiveFrom: t.effectiveFrom });
    }
    tiers.sort((a, b) => a.tierNumber - b.tierNumber);
    return { serviceId: s.id, serviceCode: s.code, serviceName: s.name, tiers };
  });

  return NextResponse.json({ data });
}

const schema = z.object({
  serviceId: z.string().min(1),
  effectiveFrom: z.string().optional(),
  tiers: z.array(z.object({ maxTxnVolume: z.number().min(0), hoursPerDay: z.number().min(0) })).min(1),
});

/** Replaces a service's tiers with a new effective-dated set. */
export async function PUT(req: Request) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid service-tier payload");
  const { serviceId, tiers } = parsed.data;
  const effectiveFrom = parsed.data.effectiveFrom ? new Date(parsed.data.effectiveFrom) : new Date();

  await prisma.$transaction(
    tiers.map((t, i) =>
      prisma.utilisationTier.upsert({
        where: { serviceId_tierNumber_effectiveFrom: { serviceId, tierNumber: i + 1, effectiveFrom } },
        update: { maxTxnVolume: t.maxTxnVolume, hoursPerDay: t.hoursPerDay },
        create: { serviceId, tierNumber: i + 1, maxTxnVolume: t.maxTxnVolume, hoursPerDay: t.hoursPerDay, effectiveFrom },
      })
    )
  );

  await createAuditLog({ userId: u.user.id, entity: "UtilisationTier", entityId: serviceId, action: "UPDATE", after: { serviceId, effectiveFrom, tiers } });
  return NextResponse.json({ ok: true });
}
