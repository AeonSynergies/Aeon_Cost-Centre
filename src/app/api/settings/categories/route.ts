import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const data = await prisma.departmentCategory.findMany({ orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }] });
  return NextResponse.json({ data });
}

const schema = z.object({ name: z.string().min(1) });

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid category payload");

  const key = parsed.data.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const created = await prisma.departmentCategory.upsert({
    where: { key },
    update: { name: parsed.data.name },
    create: { key, name: parsed.data.name, isBuiltIn: false },
  });
  await writeAudit({ userId: u.user.id, entity: "DepartmentCategory", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
