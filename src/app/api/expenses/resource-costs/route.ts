import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeResourceCost, isResourceActive, currentPeriod, type Period } from "@/lib/metrics";

function periodFromQuery(url: string): Period {
  const sp = new URL(url).searchParams;
  const y = Number(sp.get("year"));
  const m = Number(sp.get("month"));
  if (y && m) return { year: y, month: m };
  return currentPeriod();
}

/** Read-only per-resource cost breakdown for the period (auto-calculated). */
export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const departmentId = sp.get("departmentId") || "";
  const period = periodFromQuery(req.url);
  const config = await getSystemConfig();

  const resources = await prisma.resource.findMany({
    include: {
      revisions: true,
      costCentre: true,
      extraCosts: true,
      department: { select: { id: true, name: true } },
    },
  });

  const rows = resources
    .filter((r) => isResourceActive(r, period))
    .filter((r) => !departmentId || r.departmentId === departmentId)
    .map((r) => {
      const c = computeResourceCost(r, config, period);
      // Resource Expenses = salary + components + extra costs ONLY.
      // Tool costs and laptop amortisation are tracked separately (Tool Costs / Assets tabs).
      const totalCostInr = c.baseSalary + c.incentive + c.allowance + c.overhead + c.extraMonthly;
      return {
        id: r.id, name: r.name, department: r.department.name, costCentre: r.costCentre.name, isBillable: r.isBillable,
        baseSalary: c.baseSalary, incentive: c.incentive, allowance: c.allowance,
        overhead: c.overhead, extraMonthly: c.extraMonthly, totalCostInr,
      };
    })
    .sort((a, b) => b.totalCostInr - a.totalCostInr);

  const summary = {
    totalCostInr: rows.reduce((s, r) => s + r.totalCostInr, 0),
    billableCostInr: rows.filter((r) => r.isBillable).reduce((s, r) => s + r.totalCostInr, 0),
    nonBillableCostInr: rows.filter((r) => !r.isBillable).reduce((s, r) => s + r.totalCostInr, 0),
  };

  return NextResponse.json({ rows, summary });
}
