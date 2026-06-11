import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig, ratesFromConfig } from "@/lib/config";
import { currentPeriod } from "@/lib/metrics";

const WRITE = ["ADMIN", "MANAGER", "FINANCE"];

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const year = Number(sp.get("year")) || currentPeriod().year;
  const month = Number(sp.get("month")) || currentPeriod().month;

  const expenses = await prisma.expense.findMany({
    where: { periodYear: year, periodMonth: month },
    orderBy: { createdAt: "desc" },
  });

  const [depts, ccs, users, clients] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.costCentre.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.client.findMany({ select: { id: true, name: true } }),
  ]);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));
  const ccMap = new Map(ccs.map((c) => [c.id, c.name]));
  const userMap = new Map(users.map((x) => [x.id, x.name]));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const data = expenses.map((e) => ({
    ...e,
    departmentName: e.departmentId ? deptMap.get(e.departmentId) ?? null : null,
    costCentreName: e.costCentreId ? ccMap.get(e.costCentreId) ?? null : null,
    clientName: e.clientId ? clientMap.get(e.clientId) ?? null : null,
    addedByName: userMap.get(e.addedById) ?? "—",
  }));

  const config = await getSystemConfig();
  const rates = ratesFromConfig(config);
  const totalInr = data.filter((e) => e.currency === "INR").reduce((s, e) => s + (e.amountInr ?? 0), 0);
  const totalUsd = data.filter((e) => e.currency === "USD").reduce((s, e) => s + (e.amountUsd ?? 0), 0);
  const usdInInr = data.filter((e) => e.currency === "USD").reduce((s, e) => s + (e.amountInr ?? 0), 0);

  return NextResponse.json({
    data,
    summary: { totalInr, totalUsd, usdInInr, combinedInr: totalInr + usdInInr, rateB: rates.rateB },
  });
}

const schema = z.object({
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  currency: z.enum(["INR", "USD"]),
  category: z.string().min(1),
  description: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  costCentreId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  isBillable: z.boolean().optional(),
  toolName: z.string().nullable().optional(),
  rate: z.number().min(0).nullable().optional(),
  seats: z.number().min(0).nullable().optional(),
  amountUsd: z.number().min(0).nullable().optional(),
  amountInr: z.number().min(0).nullable().optional(),
  conversionRate: z.number().min(0).nullable().optional(),
});

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid expense payload");
  const d = parsed.data;

  const config = await getSystemConfig();
  const rates = ratesFromConfig(config);

  let amountInr = d.amountInr ?? null;
  let conversionRate = d.conversionRate ?? null;
  if (d.currency === "USD") {
    conversionRate = conversionRate ?? rates.rateB;
    amountInr = (d.amountUsd ?? 0) * conversionRate;
  }

  const created = await prisma.expense.create({
    data: {
      periodYear: d.periodYear,
      periodMonth: d.periodMonth,
      currency: d.currency,
      category: d.category,
      description: d.description,
      departmentId: d.departmentId || null,
      costCentreId: d.costCentreId || null,
      clientId: d.clientId || null,
      isBillable: d.isBillable ?? false,
      toolName: d.toolName || null,
      rate: d.rate ?? null,
      seats: d.seats ?? null,
      amountUsd: d.currency === "USD" ? d.amountUsd ?? 0 : null,
      amountInr,
      conversionRate,
      addedById: u.user.id,
    },
  });
  await writeAudit({ userId: u.user.id, entity: "Expense", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
