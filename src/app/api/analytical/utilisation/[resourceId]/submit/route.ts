import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER", "FINANCE"];

const schema = z.object({ periodYear: z.number().int(), periodMonth: z.number().int().min(1).max(12) });

export async function POST(req: Request, { params }: { params: { resourceId: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid payload");

  await prisma.utilisationLog.updateMany({
    where: { resourceId: params.resourceId, periodYear: parsed.data.periodYear, periodMonth: parsed.data.periodMonth },
    data: { status: "SUBMITTED" },
  });
  await writeAudit({ userId: u.user.id, entity: "UtilisationLog", entityId: params.resourceId, resourceId: params.resourceId, action: "SUBMIT" });
  return NextResponse.json({ ok: true });
}
