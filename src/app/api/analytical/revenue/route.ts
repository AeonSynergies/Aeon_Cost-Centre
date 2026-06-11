import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { currentPeriod, computeClientWaterfall, type Period } from "@/lib/metrics";
import { loadCore, clientActive } from "@/lib/analytics";
import type { RevenueWaterfall } from "@/lib/engines/feeEngine";

function periodFromQuery(url: string): Period {
  const sp = new URL(url).searchParams;
  const y = Number(sp.get("year"));
  const m = Number(sp.get("month"));
  if (y && m) return { year: y, month: m };
  return currentPeriod();
}

const ZERO: RevenueWaterfall = {
  totalServiceCostUsd: 0, proratedFeeUsd: 0, discountUsd: 0, discountedFeeUsd: 0, txnFeeUsd: 0,
  netServiceCostUsd: 0, stripeFeeUsd: 0, grossRevenueUsd: 0, abbieRoyaltyUsd: 0, reserveFundUsd: 0,
  netRevenueUsd: 0, skydoFeeUsd: 0, netUsdToConvert: 0, usdInrRate: 91, netRevenueInr: 0,
};

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const clientId = sp.get("clientId") || "";
  const method = sp.get("method") || "";
  const status = sp.get("status") || ""; // "" (all) | DRAFT | FINALISED
  const period = periodFromQuery(req.url);

  const core = await loadCore(period);

  // Billing status per client for the period (DRAFT default when no record exists).
  const billing = await prisma.billingRecord.findMany({
    where: { periodYear: period.year, periodMonth: period.month },
    select: { clientId: true, status: true },
  });
  const statusByClient = new Map(billing.map((b) => [b.clientId, b.status as string]));

  const rows = core.clients
    .filter((c) => (!clientId || c.id === clientId) && (!method || c.paymentMethod === method))
    .map((c) => {
      const wf = computeClientWaterfall(
        { startDate: c.startDate, endDate: c.endDate, billingType: c.billingType, paymentMethod: c.paymentMethod, services: c.services },
        core.config, period
      );
      return {
        id: c.id, name: c.name, billingType: c.billingType, paymentMethod: c.paymentMethod,
        packages: Array.from(new Set(c.services.map((s) => s.packageType))),
        status: statusByClient.get(c.id) ?? "DRAFT",
        active: clientActive(c.endDate, period),
        ...wf,
      };
    })
    .filter((r) => !status || r.status === status);

  const agg: RevenueWaterfall = { ...ZERO, usdInrRate: core.rates.rateA };
  for (const r of rows) {
    (Object.keys(ZERO) as (keyof RevenueWaterfall)[]).forEach((k) => {
      if (k !== "usdInrRate") agg[k] += r[k];
    });
  }

  return NextResponse.json({ waterfall: agg, rows });
}
