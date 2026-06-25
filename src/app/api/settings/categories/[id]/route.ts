import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const patchSchema = z.object({ name: z.string().min(1) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid category payload");

  const cat = await prisma.category.findUnique({ where: { id: params.id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.category.update({ where: { id: params.id }, data: { name: parsed.data.name } });
  await writeAudit({ userId: u.user.id, entity: "Category", entityId: params.id, action: "UPDATE", before: cat, after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const cat = await prisma.category.findUnique({ where: { id: params.id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cat.isBuiltIn) return badRequest("Built-in categories cannot be deleted");

  await prisma.category.delete({ where: { id: params.id } });
  await writeAudit({ userId: u.user.id, entity: "Category", entityId: params.id, action: "DELETE", before: cat });
  return NextResponse.json({ ok: true });
}
