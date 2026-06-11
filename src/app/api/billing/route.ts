import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { currentPeriod } from "@/lib/metrics";

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const year = Number(sp.get("year")) || currentPeriod().year;
  const month = Number(sp.get("month")) || currentPeriod().month;

  const records = await prisma.billingRecord.findMany({
    where: { periodYear: year, periodMonth: month },
    include: { client: { select: { id: true, name: true, billingType: true } } },
    orderBy: { createdAt: "desc" },
  });

  const data = records.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.client.name,
    billingType: r.client.billingType,
    periodYear: r.periodYear,
    periodMonth: r.periodMonth,
    proratedFeeUsd: r.proratedFeeUsd,
    discountUsd: r.discountUsd,
    stripeFeeUsd: r.stripeFeeUsd,
    grossRevenueUsd: r.grossRevenueUsd,
    netRevenueUsd: r.netRevenueUsd,
    netRevenueInr: r.netRevenueInr,
    status: r.status,
  }));

  const summary = {
    total: data.length,
    draft: data.filter((d) => d.status === "DRAFT").length,
    finalised: data.filter((d) => d.status === "FINALISED").length,
    grossRevenueUsd: data.reduce((s, d) => s + d.grossRevenueUsd, 0),
    netRevenueInr: data.reduce((s, d) => s + d.netRevenueInr, 0),
  };

  return NextResponse.json({ data, summary });
}
