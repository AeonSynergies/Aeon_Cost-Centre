import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { currentPeriod, type Period } from "@/lib/metrics";
import { loadCore, resourceAllocation } from "@/lib/analytics";

function periodFromQuery(url: string): Period {
  const sp = new URL(url).searchParams;
  const y = Number(sp.get("year"));
  const m = Number(sp.get("month"));
  if (y && m) return { year: y, month: m };
  return currentPeriod();
}

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const period = periodFromQuery(req.url);
  const core = await loadCore(period);
  const rows = resourceAllocation(core, period).filter((r) => r.isBillable);

  const summary = {
    revenueInr: rows.reduce((s, r) => s + r.revenueInr, 0),
    allottedInr: rows.reduce((s, r) => s + r.allottedInr, 0),
    costInr: rows.reduce((s, r) => s + r.costInr, 0),
    netMarginInr: rows.reduce((s, r) => s + r.surplusInr, 0),
    avgMarginPct: rows.length ? rows.reduce((s, r) => s + r.marginPct, 0) / rows.length : 0,
  };

  return NextResponse.json({ data: rows, summary });
}
