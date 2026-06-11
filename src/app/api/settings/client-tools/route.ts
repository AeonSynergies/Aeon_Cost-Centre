import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, badRequest } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

const ADMIN = ["ADMIN"];
const schema = z.object({ googleWorkspaceInr: z.number().min(0) });

export async function PATCH(req: Request) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid client tools payload");
  await prisma.systemConfig.upsert({
    where: { configKey: "google_workspace_inr" },
    update: { configValue: parsed.data.googleWorkspaceInr as Prisma.InputJsonValue, updatedById: u.user.id },
    create: { configKey: "google_workspace_inr", configValue: parsed.data.googleWorkspaceInr as Prisma.InputJsonValue, effectiveFrom: new Date(), updatedById: u.user.id },
  });
  await createAuditLog({ userId: u.user.id, entity: "SystemConfig", entityId: "google_workspace_inr", action: "UPDATE", after: parsed.data });
  return NextResponse.json({ ok: true });
}
