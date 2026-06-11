import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig, ratesFromConfig } from "@/lib/config";

const WRITE = ["ADMIN", "MANAGER", "FINANCE"];

const patchSchema = z.object({
  periodYear: z.number().int().optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  departmentId: z.string().nullable().optional(),
  costCentreId: z.string().nullable().optional(),
  amountUsd: z.number().min(0).nullable().optional(),
  amountInr: z.number().min(0).nullable().optional(),
  conversionRate: z.number().min(0).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid expense payload");
  const d = parsed.data;

  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await getSystemConfig();
  const rates = ratesFromConfig(config);

  const data: Record<string, unknown> = {
    ...(d.periodYear !== undefined ? { periodYear: d.periodYear } : {}),
    ...(d.periodMonth !== undefined ? { periodMonth: d.periodMonth } : {}),
    ...(d.category !== undefined ? { category: d.category } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.departmentId !== undefined ? { departmentId: d.departmentId || null } : {}),
    ...(d.costCentreId !== undefined ? { costCentreId: d.costCentreId || null } : {}),
  };

  if (existing.currency === "USD") {
    const rate = d.conversionRate ?? existing.conversionRate ?? rates.rateB;
    const usd = d.amountUsd ?? existing.amountUsd ?? 0;
    data.conversionRate = rate;
    data.amountUsd = usd;
    data.amountInr = usd * rate;
  } else if (d.amountInr !== undefined) {
    data.amountInr = d.amountInr;
  }

  const updated = await prisma.expense.update({ where: { id: params.id }, data });
  await writeAudit({ userId: u.user.id, entity: "Expense", entityId: updated.id, action: "UPDATE", before: existing, after: updated });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;
  await prisma.expense.delete({ where: { id: params.id } });
  await writeAudit({ userId: u.user.id, entity: "Expense", entityId: params.id, action: "DELETE" });
  return NextResponse.json({ ok: true });
}
