import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const cat = await prisma.departmentCategory.findUnique({ where: { id: params.id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cat.isBuiltIn) return badRequest("Built-in categories cannot be deleted");

  await prisma.departmentCategory.delete({ where: { id: params.id } });
  await writeAudit({ userId: u.user.id, entity: "DepartmentCategory", entityId: params.id, action: "DELETE", before: cat });
  return NextResponse.json({ ok: true });
}
