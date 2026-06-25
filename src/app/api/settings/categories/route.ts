import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];
const TYPES = ["DEPARTMENT", "EXPENSE_INR", "EXPENSE_USD", "REVENUE_PRODUCT", "REVENUE_SERVICE", "ASSET"] as const;
type CatType = (typeof TYPES)[number];

const keyFromName = (name: string) => name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");

/** Usage count for a category, by type. */
async function usageCount(type: CatType, name: string): Promise<number> {
  if (type === "DEPARTMENT") return prisma.department.count({ where: { category: keyFromName(name) as never } });
  if (type === "EXPENSE_INR") return prisma.expense.count({ where: { currency: "INR", category: name } });
  if (type === "EXPENSE_USD") return prisma.expense.count({ where: { currency: "USD", category: name } });
  if (type === "ASSET") return prisma.resourceAsset.count({ where: { assetType: keyFromName(name) as never } });
  return 0; // revenue categories — future use
}

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const typeParam = new URL(req.url).searchParams.get("type") as CatType | null;
  const where = typeParam && TYPES.includes(typeParam) ? { type: typeParam } : {};
  const cats = await prisma.category.findMany({ where, orderBy: [{ type: "asc" }, { isBuiltIn: "desc" }, { name: "asc" }] });

  const data = await Promise.all(
    cats.map(async (c) => ({ ...c, usedIn: await usageCount(c.type as CatType, c.name) }))
  );
  return NextResponse.json({ data });
}

const schema = z.object({ name: z.string().min(1), type: z.enum(TYPES) });

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid category payload");
  const { name, type } = parsed.data;

  const created = await prisma.category.upsert({
    where: { name_type: { name, type } },
    update: { name },
    create: { name, type, isBuiltIn: false },
  });
  await writeAudit({ userId: u.user.id, entity: "Category", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
