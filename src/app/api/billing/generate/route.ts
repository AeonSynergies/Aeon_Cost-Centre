import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeClientWaterfall, type Period } from "@/lib/metrics";

const ADMIN = ["ADMIN"];

const schema = z.object({
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  clientIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid generate payload");
  const { periodYear, periodMonth, clientIds } = parsed.data;
  const period: Period = { year: periodYear, month: periodMonth };

  const config = await getSystemConfig();

  const clients = await prisma.client.findMany({
    where: clientIds.length ? { id: { in: clientIds } } : {},
    include: { services: { select: { monthlyFeeUsd: true, discountPct: true } } },
  });

  const existing = await prisma.billingRecord.findMany({
    where: { periodYear, periodMonth, clientId: { in: clients.map((c) => c.id) } },
    select: { clientId: true },
  });
  const existingSet = new Set(existing.map((e) => e.clientId));

  let created = 0;
  let skipped = 0;
  for (const c of clients) {
    if (existingSet.has(c.id)) { skipped++; continue; }
    if (c.services.length === 0) { skipped++; continue; }

    const wf = computeClientWaterfall(
      { startDate: c.startDate, endDate: c.endDate, billingType: c.billingType, paymentMethod: c.paymentMethod, services: c.services },
      config,
      period
    );

    await prisma.billingRecord.create({
      data: {
        clientId: c.id,
        periodYear,
        periodMonth,
        totalServiceCostUsd: wf.totalServiceCostUsd,
        proratedFeeUsd: wf.proratedFeeUsd,
        discountUsd: wf.discountUsd,
        discountedFeeUsd: wf.discountedFeeUsd,
        txnFeeUsd: wf.txnFeeUsd,
        netServiceCostUsd: wf.netServiceCostUsd,
        stripeFeeUsd: wf.stripeFeeUsd,
        grossRevenueUsd: wf.grossRevenueUsd,
        abbieRoyaltyUsd: wf.abbieRoyaltyUsd,
        reserveFundUsd: wf.reserveFundUsd,
        netRevenueUsd: wf.netRevenueUsd,
        skydoFeeUsd: wf.skydoFeeUsd,
        netUsdToConvert: wf.netUsdToConvert,
        usdInrRate: wf.usdInrRate,
        netRevenueInr: wf.netRevenueInr,
        status: "DRAFT",
      },
    });
    created++;
  }

  await writeAudit({ userId: u.user.id, entity: "BillingRecord", entityId: `${periodYear}-${periodMonth}`, action: "GENERATE", after: { created, skipped } });
  return NextResponse.json({ created, skipped });
}
