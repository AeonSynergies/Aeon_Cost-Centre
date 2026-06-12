import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeClientWaterfall, computeResourceCost, isResourceActive, currentPeriod, type Period } from "@/lib/metrics";
import { calculateAllocation } from "@/lib/engines/allocationEngine";
import { calculateDeptRevenueShare } from "@/lib/engines/revenueShareEngine";
import { MONTH_NAMES } from "@/lib/analytics";

function bucketForCategory(cat: string): "dept" | "bd" | "product" | "profit" {
  if (cat === "BUSINESS_DEVELOPMENT") return "bd";
  if (cat === "SAAS_DEVELOPMENT") return "product";
  return "dept";
}

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const year = Number(sp.get("year")) || currentPeriod().year;
  const monthParam = Number(sp.get("month")) || null;

  const config = await getSystemConfig();
  const [clients, resources, departments, expenses, allocCfg] = await Promise.all([
    prisma.client.findMany({ include: { services: { include: { service: { select: { id: true, departmentId: true } } } } } }),
    prisma.resource.findMany({ include: { revisions: true, costCentre: true, extraCosts: true, department: { select: { id: true, name: true, category: true } } } }),
    prisma.department.findMany({ select: { id: true, name: true, category: true } }),
    prisma.expense.findMany({ where: { periodYear: year } }),
    prisma.allocationConfig.findUnique({ where: { year } }),
  ]);

  const pct = allocCfg ?? { deptReservePct: 50, businessDevPct: 30, productDevPct: 20, profitPct: 0 };
  const deptById = new Map(departments.map((d) => [d.id, d]));
  const clientFacing = departments.filter((d) => d.category === "CLIENT_FACING");

  function deptRevenue(p: Period): { total: number; byDept: Map<string, number> } {
    const byDept = new Map<string, number>();
    let total = 0;
    for (const c of clients) {
      const totalFee = c.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
      const wf = computeClientWaterfall(
        { startDate: c.startDate, endDate: c.endDate, billingType: c.billingType, paymentMethod: c.paymentMethod, txnFeeEnabled: c.txnFeeEnabled, services: c.services },
        config, p
      );
      total += wf.netRevenueInr;
      if (totalFee <= 0) continue;
      for (const cs of c.services) {
        const net = wf.netRevenueInr * (cs.monthlyFeeUsd / totalFee);
        byDept.set(cs.service.departmentId, (byDept.get(cs.service.departmentId) ?? 0) + net);
      }
    }
    return { total, byDept };
  }

  function workforceByDept(p: Period): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of resources) {
      if (!isResourceActive(r, p)) continue;
      const cost = computeResourceCost(r, config, p).totalCostInr;
      m.set(r.departmentId, (m.get(r.departmentId) ?? 0) + cost);
    }
    return m;
  }

  function expenseActuals(month: number) {
    let dept = 0, bd = 0, product = 0;
    for (const e of expenses.filter((x) => x.periodMonth === month)) {
      const amt = e.amountInr ?? 0;
      const cat = e.departmentId ? deptById.get(e.departmentId)?.category ?? "INTERNAL" : "INTERNAL";
      const b = bucketForCategory(cat);
      if (b === "bd") bd += amt; else if (b === "product") product += amt; else dept += amt;
    }
    return { dept, bd, product };
  }

  // ---- Single month dept breakdown ----
  if (monthParam) {
    const p = { year, month: monthParam };
    const { byDept } = deptRevenue(p);
    const wf = workforceByDept(p);
    const breakdown = clientFacing.map((d) => {
      const revenue = byDept.get(d.id) ?? 0;
      const reserve = calculateDeptRevenueShare(revenue);
      const workforce = wf.get(d.id) ?? 0;
      return {
        id: d.id, name: d.name, category: d.category,
        revenueInr: revenue, deptReserveInr: reserve,
        workforceCostInr: workforce, toolCostInr: 0,
        totalDeptCostInr: workforce, surplusInr: reserve - workforce,
      };
    });
    return NextResponse.json({ breakdown });
  }

  // ---- Month-on-month summary + YTD buckets ----
  const monthly = MONTH_NAMES.map((mName, i) => {
    const p = { year, month: i + 1 };
    const { total } = deptRevenue(p);
    const alloc = calculateAllocation({ netRevenueInr: total, deptReservePct: pct.deptReservePct, businessDevPct: pct.businessDevPct, productDevPct: pct.productDevPct, profitPct: pct.profitPct });
    const act = expenseActuals(i + 1);
    const overBudget = act.bd > alloc.businessDevInr || act.product > alloc.productDevInr || act.dept > alloc.deptReserveInr;
    return {
      month: mName,
      netRevenueInr: total,
      deptReserveInr: alloc.deptReserveInr,
      bdBudget: alloc.businessDevInr, bdActual: act.bd,
      productBudget: alloc.productDevInr, productActual: act.product,
      profitBudget: alloc.profitInr, profitActual: 0,
      status: overBudget ? "Over budget" : "On track",
    };
  });

  const ytd = (k: keyof (typeof monthly)[number]) => monthly.reduce((s, m) => s + (typeof m[k] === "number" ? (m[k] as number) : 0), 0);
  const buckets = [
    { key: "Dept Reserve", pct: pct.deptReservePct, budget: ytd("deptReserveInr"), actual: monthly.reduce((s, m) => s + expenseActualsDept(m.month), 0) },
    { key: "Business Dev", pct: pct.businessDevPct, budget: ytd("bdBudget"), actual: ytd("bdActual") },
    { key: "Product Dev", pct: pct.productDevPct, budget: ytd("productBudget"), actual: ytd("productActual") },
    { key: "Profit", pct: pct.profitPct, budget: ytd("profitBudget"), actual: 0 },
  ];
  function expenseActualsDept(monthName: string) {
    const month = MONTH_NAMES.indexOf(monthName) + 1;
    return expenseActuals(month).dept;
  }

  const kpi = {
    totalNetRevenueInr: ytd("netRevenueInr"),
    deptReserveInr: ytd("deptReserveInr"),
    companyPoolInr: ytd("bdBudget") + ytd("productBudget") + ytd("profitBudget"),
    overBudgetCount: buckets.filter((b) => b.actual > b.budget && b.budget > 0).length,
  };

  return NextResponse.json({ year, kpi, buckets, monthly });
}
