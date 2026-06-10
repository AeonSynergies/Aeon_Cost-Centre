import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/server/api";

const WRITE = ["ADMIN", "MANAGER"];

const patchSchema = z.object({
  packageType: z.enum(["LESS_THAN_25", "MORE_THAN_25"]).optional(),
  monthlyFeeUsd: z.number().min(0).optional(),
  effectiveFrom: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; pkgId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid package payload");

  const d = parsed.data;
  const updated = await prisma.servicePackage.update({
    where: { id: params.pkgId },
    data: {
      ...(d.packageType !== undefined ? { packageType: d.packageType } : {}),
      ...(d.monthlyFeeUsd !== undefined ? { monthlyFeeUsd: d.monthlyFeeUsd } : {}),
      ...(d.effectiveFrom !== undefined ? { effectiveFrom: new Date(d.effectiveFrom) } : {}),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ServicePackage", entityId: updated.id, action: "UPDATE", after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; pkgId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  await prisma.servicePackage.delete({ where: { id: params.pkgId } });
  await writeAudit({ userId: u.user.id, entity: "ServicePackage", entityId: params.pkgId, action: "DELETE" });
  return NextResponse.json({ ok: true });
}
