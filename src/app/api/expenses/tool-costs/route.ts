import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig, ratesFromConfig } from "@/lib/config";
import { isResourceActive, currentPeriod } from "@/lib/metrics";

const WRITE = ["ADMIN", "MANAGER", "FINANCE"];

const schema = z.object({
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
});

/**
 * Auto-populates Tool Cost expenses for a period from cost-centre rate config.
 * Seats = count of active resources per cost centre. Creates/refreshes one
 * TOOL_COST expense row per (cost centre, tool). Existing auto rows for the
 * period are removed first so re-running is idempotent.
 */
export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid payload");
  const { periodYear, periodMonth } = parsed.data;
  const period = { year: periodYear, month: periodMonth };

  const config = await getSystemConfig();
  const rates = ratesFromConfig(config);

  const [costCentres, resources] = await Promise.all([
    prisma.costCentre.findMany({ select: { id: true, name: true, ms365RateInr: true, zoomRateUsd: true } }),
    prisma.resource.findMany({ include: { revisions: true } }),
  ]);

  const seatsByCc = new Map<string, number>();
  for (const r of resources) {
    if (!isResourceActive(r, period)) continue;
    seatsByCc.set(r.costCentreId, (seatsByCc.get(r.costCentreId) ?? 0) + 1);
  }

  // Clear previous auto-populated tool-cost rows for the period.
  await prisma.expense.deleteMany({ where: { periodYear, periodMonth, category: "TOOL_COST" } });

  const created: unknown[] = [];
  for (const cc of costCentres) {
    const seats = seatsByCc.get(cc.id) ?? 0;
    if (seats <= 0) continue;
    if (cc.ms365RateInr > 0) {
      created.push(await prisma.expense.create({
        data: {
          periodYear, periodMonth, currency: "INR", category: "TOOL_COST",
          description: `MS 365 — ${cc.name}`, toolName: "MS 365", costCentreId: cc.id,
          rate: cc.ms365RateInr, seats, amountInr: cc.ms365RateInr * seats, addedById: u.user.id,
        },
      }));
    }
    if (cc.zoomRateUsd > 0) {
      const amountUsd = cc.zoomRateUsd * seats;
      created.push(await prisma.expense.create({
        data: {
          periodYear, periodMonth, currency: "USD", category: "TOOL_COST",
          description: `Zoom — ${cc.name}`, toolName: "Zoom", costCentreId: cc.id,
          rate: cc.zoomRateUsd, seats, amountUsd, conversionRate: rates.rateB, amountInr: amountUsd * rates.rateB, addedById: u.user.id,
        },
      }));
    }
  }

  await writeAudit({ userId: u.user.id, entity: "Expense", entityId: `tool-costs:${periodYear}-${periodMonth}`, action: "CREATE", after: { count: created.length } });
  return NextResponse.json({ data: created, count: created.length }, { status: 201 });
}

void currentPeriod;
