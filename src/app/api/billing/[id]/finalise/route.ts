import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const ADMIN = ["ADMIN"];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const before = await prisma.billingRecord.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status === "FINALISED") return badRequest("Already finalised");

  const updated = await prisma.billingRecord.update({ where: { id: params.id }, data: { status: "FINALISED" } });
  await writeAudit({ userId: u.user.id, entity: "BillingRecord", entityId: updated.id, action: "FINALISE", before, after: updated });
  return NextResponse.json({ data: updated });
}
