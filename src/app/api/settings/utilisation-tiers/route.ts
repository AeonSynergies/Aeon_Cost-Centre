import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, badRequest } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { DEFAULT_UTIL_TIERS } from "@/lib/engines/utilisationEngine";

const ADMIN = ["ADMIN"];

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const row = await prisma.systemConfig.findUnique({ where: { configKey: "util_tiers" } });
  const tiers = Array.isArray(row?.configValue) ? row!.configValue : DEFAULT_UTIL_TIERS;
  return NextResponse.json({ data: tiers });
}

const schema = z.object({ tiers: z.array(z.object({ maxTxn: z.number().min(0), hoursPerDay: z.number().min(0) })).min(1) });

export async function PUT(req: Request) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid tiers payload");
  await prisma.systemConfig.upsert({
    where: { configKey: "util_tiers" },
    update: { configValue: parsed.data.tiers as Prisma.InputJsonValue, updatedById: u.user.id },
    create: { configKey: "util_tiers", configValue: parsed.data.tiers as Prisma.InputJsonValue, effectiveFrom: new Date(), updatedById: u.user.id },
  });
  await createAuditLog({ userId: u.user.id, entity: "SystemConfig", entityId: "util_tiers", action: "UPDATE", after: parsed.data });
  return NextResponse.json({ ok: true });
}
