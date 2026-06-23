import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const BUILTIN = [
  { key: "CLIENT_FACING", name: "Client Facing" },
  { key: "ADMINISTRATION", name: "Administration" },
  { key: "BUSINESS_DEVELOPMENT", name: "Business Development" },
  { key: "INTERNAL", name: "Internal" },
  { key: "SAAS_DEVELOPMENT", name: "SaaS Development" },
];

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;

  let cats = await prisma.departmentCategory.findMany({ orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }] });
  // Resilience: if the table was never seeded, surface the built-in defaults so
  // the Categories tab is never blank.
  if (cats.length === 0) {
    cats = BUILTIN.map((c) => ({ id: c.key, key: c.key, name: c.name, isBuiltIn: true, createdAt: new Date(), updatedAt: new Date() })) as typeof cats;
  }

  const depts = await prisma.department.findMany({ select: { category: true } });
  const countByKey = new Map<string, number>();
  for (const d of depts) countByKey.set(d.category, (countByKey.get(d.category) ?? 0) + 1);

  const data = cats.map((c) => ({ ...c, deptCount: countByKey.get(c.key) ?? 0 }));
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
