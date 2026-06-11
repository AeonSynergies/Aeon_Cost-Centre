import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, badRequest } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

const ADMIN = ["ADMIN"];
const KEYS = ["route_threshold", "below_threshold_hrs", "above_threshold_hrs", "fleet_addon", "marsh_addon"] as const;
const DEFAULTS: Record<string, number> = { route_threshold: 50, below_threshold_hrs: 1.0, above_threshold_hrs: 1.5, fleet_addon: 0.5, marsh_addon: 0.5 };

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const rows = await prisma.systemConfig.findMany({ where: { configKey: { in: [...KEYS] } } });
  const out: Record<string, number> = { ...DEFAULTS };
  for (const r of rows) if (typeof r.configValue === "number") out[r.configKey] = r.configValue as number;
  return NextResponse.json({ data: out });
}

const schema = z.object(Object.fromEntries(KEYS.map((k) => [k, z.number()])) as Record<(typeof KEYS)[number], z.ZodNumber>);

export async function PATCH(req: Request) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid invoice rules payload");
  for (const [k, v] of Object.entries(parsed.data)) {
    await prisma.systemConfig.upsert({
      where: { configKey: k },
      update: { configValue: v as Prisma.InputJsonValue, updatedById: u.user.id },
      create: { configKey: k, configValue: v as Prisma.InputJsonValue, effectiveFrom: new Date(), updatedById: u.user.id },
    });
  }
  await createAuditLog({ userId: u.user.id, entity: "SystemConfig", entityId: "invoice_rules", action: "UPDATE", after: parsed.data });
  return NextResponse.json({ ok: true });
}
