import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const assets = await prisma.resourceAsset.findMany({
    where: { resourceId: params.id },
    orderBy: { issueDate: "desc" },
  });
  return NextResponse.json({ data: assets });
}

const schema = z.object({
  assetType: z.enum(["LAPTOP", "CHARGER", "MOUSE", "KEYBOARD", "MONITOR", "HEADSET", "OTHER"]),
  description: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  issueDate: z.string().min(1),
  returnDate: z.string().optional().nullable(),
  status: z.enum(["ISSUED", "RETURNED", "LOST"]).default("ISSUED"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid asset payload");
  const d = parsed.data;

  const created = await prisma.resourceAsset.create({
    data: {
      resourceId: params.id,
      assetType: d.assetType,
      description: d.description || null,
      serialNumber: d.serialNumber || null,
      issueDate: new Date(d.issueDate),
      returnDate: d.returnDate ? new Date(d.returnDate) : null,
      status: d.status,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ResourceAsset", entityId: created.id, resourceId: params.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
