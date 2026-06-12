import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";
import { getSystemConfig, ratesFromConfig } from "@/lib/config";
import { computeClientWaterfall, currentPeriod, type Period } from "@/lib/metrics";
import { usdToInrRevenue } from "@/lib/engines/currencyEngine";

const WRITE = ["ADMIN", "MANAGER"];

function periodFromQuery(url: string): Period {
  const sp = new URL(url).searchParams;
  const y = Number(sp.get("year"));
  const m = Number(sp.get("month"));
  if (y && m) return { year: y, month: m };
  return currentPeriod();
}

/** Iterate months from start..period inclusive. */
function monthsBetween(start: Date, period: Period): Period[] {
  const out: Period[] = [];
  let y = start.getFullYear();
  let m = start.getMonth() + 1;
  while (y < period.year || (y === period.year && m <= period.month)) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function clientStatus(endDate: Date | null, now: Date): "ACTIVE" | "CHURNED" | "ENDING" {
  if (!endDate) return "ACTIVE";
  const sentinel = new Date(2026, 11, 31).getTime();
  if (endDate.getTime() === sentinel) return "ACTIVE";
  if (endDate < now) return "CHURNED";
  const days = (endDate.getTime() - now.getTime()) / 86_400_000;
  return days <= 60 ? "ENDING" : "ACTIVE";
}

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const period = periodFromQuery(req.url);
  const config = await getSystemConfig();
  const rates = ratesFromConfig(config);
  const now = new Date();

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      services: { include: { service: { select: { id: true, code: true } } } },
    },
  });

  const data = clients.map((c) => {
    const svcInput = c.services.map((s) => ({
      serviceId: s.serviceId,
      monthlyFeeUsd: s.monthlyFeeUsd,
      discountPct: s.discountPct,
    }));
    const clientShape = {
      startDate: c.startDate,
      endDate: c.endDate,
      billingType: c.billingType,
      paymentMethod: c.paymentMethod,
      txnFeeEnabled: c.txnFeeEnabled,
      services: svcInput,
    };
    const monthlyFeeUsd = svcInput.reduce((s, x) => s + x.monthlyFeeUsd, 0);
    const wfNow = computeClientWaterfall(clientShape, config, period);

    // Cumulative net revenue from start to current period.
    let cumUsd = 0;
    let cumInr = 0;
    for (const p of monthsBetween(c.startDate, period)) {
      const wf = computeClientWaterfall(clientShape, config, p);
      cumUsd += wf.netRevenueUsd;
      cumInr += wf.netRevenueInr;
    }

    const packages = Array.from(new Set(c.services.map((s) => s.packageType)));

    return {
      id: c.id,
      name: c.name,
      billingType: c.billingType,
      paymentMethod: c.paymentMethod,
      txnFeeEnabled: c.txnFeeEnabled,
      packages,
      services: c.services.map((s) => s.service.code),
      startDate: c.startDate,
      endDate: c.endDate,
      driverBand: c.driverBand,
      vanBand: c.vanBand,
      routeBand: c.routeBand,
      monthlyFeeUsd,
      monthlyFeeInr: usdToInrRevenue(monthlyFeeUsd, rates.rateA),
      currentNetRevenueInr: wfNow.netRevenueInr,
      totalRevenueUsd: cumUsd,
      totalRevenueInr: cumInr,
      status: clientStatus(c.endDate, now),
    };
  });

  const active = data.filter((d) => d.status !== "CHURNED");
  const summary = {
    active: active.length,
    churned: data.filter((d) => d.status === "CHURNED").length,
    mrrUsd: active.reduce((s, d) => s + d.monthlyFeeUsd, 0),
    monthRevenueInr: active.reduce((s, d) => s + d.currentNetRevenueInr, 0),
    avgPerClientUsd: active.length
      ? active.reduce((s, d) => s + d.monthlyFeeUsd, 0) / active.length
      : 0,
  };

  return NextResponse.json({ data, summary });
}

const serviceSchema = z.object({
  serviceId: z.string().min(1),
  packageType: z.enum(["LESS_THAN_25", "MORE_THAN_25"]),
  monthlyFeeUsd: z.number().min(0),
  discountMode: z.enum(["PER_SERVICE", "PER_PACKAGE", "TOTAL"]).default("PER_PACKAGE"),
  discountPct: z.number().min(0).max(100).default(0),
});

const createSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  paymentMethod: z.enum(["CARD", "ACH"]),
  billingType: z.enum(["LEGACY", "NEW"]),
  txnFeeEnabled: z.boolean().optional(),
  driverBand: z.string().optional().nullable(),
  vanBand: z.string().optional().nullable(),
  routeBand: z.string().optional().nullable(),
  services: z.array(serviceSchema).default([]),
});

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid client payload");
  const d = parsed.data;

  const created = await prisma.client.create({
    data: {
      name: d.name,
      startDate: new Date(d.startDate),
      endDate: d.endDate ? new Date(d.endDate) : null,
      paymentMethod: d.paymentMethod,
      billingType: d.billingType,
      txnFeeEnabled: d.txnFeeEnabled ?? true,
      driverBand: d.driverBand || null,
      vanBand: d.vanBand || null,
      routeBand: d.routeBand || null,
      services: {
        create: d.services.map((s) => ({
          serviceId: s.serviceId,
          packageType: s.packageType,
          monthlyFeeUsd: s.monthlyFeeUsd,
          discountMode: s.discountMode,
          discountPct: s.discountPct,
        })),
      },
    },
  });
  await writeAudit({ userId: u.user.id, entity: "Client", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
