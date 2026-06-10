import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/server/api";

const WRITE = ["ADMIN", "MANAGER"];

const patchSchema = z.object({
  assetType: z.enum(["LAPTOP", "CHARGER", "MOUSE", "KEYBOARD", "MONITOR", "HEADSET", "OTHER"]).optional(),
  description: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  issueDate: z.string().optional(),
  returnDate: z.string().nullable().optional(),
  status: z.enum(["ISSUED", "RETURNED", "LOST"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; assetId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid asset payload");
  const d = parsed.data;

  const updated = await prisma.resourceAsset.update({
    where: { id: params.assetId },
    data: {
      ...(d.assetType !== undefined ? { assetType: d.assetType } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
      ...(d.serialNumber !== undefined ? { serialNumber: d.serialNumber || null } : {}),
      ...(d.issueDate !== undefined ? { issueDate: new Date(d.issueDate) } : {}),
      ...(d.returnDate !== undefined ? { returnDate: d.returnDate ? new Date(d.returnDate) : null } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ResourceAsset", entityId: updated.id, resourceId: params.id, action: "UPDATE", after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; assetId: string } }
) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  await prisma.resourceAsset.delete({ where: { id: params.assetId } });
  await writeAudit({ userId: u.user.id, entity: "ResourceAsset", entityId: params.assetId, resourceId: params.id, action: "DELETE" });
  return NextResponse.json({ ok: true });
}
