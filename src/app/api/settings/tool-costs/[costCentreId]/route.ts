import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, badRequest } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

const ADMIN = ["ADMIN"];

const schema = z.object({ ms365RateInr: z.number().min(0), zoomRateUsd: z.number().min(0) });

export async function PATCH(req: Request, { params }: { params: { costCentreId: string } }) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid tool cost payload");

  const updated = await prisma.costCentre.update({ where: { id: params.costCentreId }, data: parsed.data });
  await createAuditLog({ userId: u.user.id, entity: "CostCentre", entityId: updated.id, action: "TOOL_COSTS", after: parsed.data });
  return NextResponse.json({ data: updated });
}
