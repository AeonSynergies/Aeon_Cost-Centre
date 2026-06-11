import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const config = await getSystemConfig();
  const allocations = await prisma.allocationConfig.findMany({ orderBy: { year: "asc" } });
  return NextResponse.json({ config, allocations });
}

const schema = z.object({ values: z.record(z.string(), z.number()) });

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid settings payload");

  const now = new Date();
  for (const [configKey, value] of Object.entries(parsed.data.values)) {
    await prisma.systemConfig.upsert({
      where: { configKey },
      update: { configValue: value as Prisma.InputJsonValue, updatedById: u.user.id },
      create: { configKey, configValue: value as Prisma.InputJsonValue, effectiveFrom: now, updatedById: u.user.id },
    });
  }
  await writeAudit({ userId: u.user.id, entity: "SystemConfig", entityId: "bulk", action: "UPDATE", after: parsed.data.values });
  return NextResponse.json({ ok: true });
}
