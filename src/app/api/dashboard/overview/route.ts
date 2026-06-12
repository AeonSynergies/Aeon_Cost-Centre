import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeClientWaterfall, computeResourceCost, isResourceActive, currentPeriod, type Period } from "@/lib/metrics";
import { calculateAllocation } from "@/lib/engines/allocationEngine";
import { calculateDeptRevenueShare } from "@/lib/engines/revenueShareEngine";
import { usdToInrRevenue } from "@/lib/engines/currencyEngine";
import { loadCore, revenueMaps, clientActive, MONTH_NAMES } from "@/lib/analytics";

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
  const { waterfalls, serviceNetByService } = revenueMaps(core.clients, core.config, period);

  const [expenses, allocCfg, departments] = await Promise.all([
    prisma.expense.findMany({ where: { periodYear: period.year } }),
    prisma.allocationConfig.findUnique({ where: { year: period.year } }),
    prisma.department.findMany({ include: { services: { select: { id: true } } } }),
  ]);

  // Financial KPIs (period).
  const wfList = core.clients.map((c) => waterfalls.get(c.id)!);
  const totalServiceCostUsd = wfList.reduce((s, w) => s + w.totalServiceCostUsd, 0);
  const grossRevenueUsd = wfList.reduce((s, w) => s + w.grossRevenueUsd, 0);
  const netRevenueUsd = wfList.reduce((s, w) => s + w.netRevenueUsd, 0);
  const netRevenueInr = wfList.reduce((s, w) => s + w.netRevenueInr, 0);
  const abbieRoyaltyUsd = wfList.reduce((s, w) => s + w.abbieRoyaltyUsd, 0);
  const reserveFundUsd = wfList.reduce((s, w) => s + w.reserveFundUsd, 0);

  const expMonth = expenses.filter((e) => e.periodMonth === period.month);
  const totalExpensesInr = expMonth.reduce((s, e) => s + (e.amountInr ?? 0), 0);

  // Cost KPIs + cost breakdown by cost centre (stacked bar).
  const active = core.resources.filter((r) => isResourceActive(r, period));
  let salaryInr = 0, fullyLoadedInr = 0, toolInr = 0, overheadInr = 0;
  const ccAgg = new Map<string, { name: string; salary: number; tool: number; overhead: number }>();
  for (const r of active) {
    const c = computeResourceCost(r, core.config, period);
    salaryInr += c.baseSalary; fullyLoadedInr += c.totalCostInr; toolInr += c.ms365Cost + c.zoomCost; overheadInr += c.overhead;
    const cc = ccAgg.get(r.costCentreId) ?? { name: r.costCentre.name, salary: 0, tool: 0, overhead: 0 };
    cc.salary += c.baseSalary; cc.tool += c.ms365Cost + c.zoomCost; cc.overhead += c.overhead;
    ccAgg.set(r.costCentreId, cc);
  }
  const netProfitInr = netRevenueInr - fullyLoadedInr - totalExpensesInr;
  const costByCostCentre = Array.from(ccAgg.values()).map((c) => ({ name: c.name, salary: Math.round(c.salary), tool: Math.round(c.tool), overhead: Math.round(c.overhead) }));

  // Monthly salary trend (Jan–Dec) — base salary of resources active each month.
  const salaryTrend = MONTH_NAMES.map((m, i) => {
    const p = { year: period.year, month: i + 1 };
    const total = core.resources.filter((r) => isResourceActive(r, p)).reduce((s, r) => s + computeResourceCost(r, core.config, p).baseSalary, 0);
    return { month: m, salary: Math.round(total), future: i + 1 > period.month };
  });

  // Capacity (per-resource utilisation) for the Capacity tab.
  const utilRows = core.resources
    .filter((r) => r.utilisationLogs.length > 0)
    .map((r) => {
      const total = r.utilisationLogs.reduce((s, l) => s + l.totalHoursPerDay, 0);
      const pctU = (total / core.config.available_hrs_per_day) * 100;
      return { id: r.id, name: r.name, pct: Math.round(pctU) };
    })
    .sort((a, b) => b.pct - a.pct);
  const capacity = {
    avgUtilPct: utilRows.length ? utilRows.reduce((s, r) => s + r.pct, 0) / utilRows.length : 0,
    overCap: utilRows.filter((r) => r.pct > 100).length,
    underUtil: utilRows.filter((r) => r.pct < 80).length,
    healthy: utilRows.filter((r) => r.pct >= 80 && r.pct <= 100).length,
    perResource: utilRows,
  };

  // Operations KPIs.
  const activeClients = core.clients.filter((c) => clientActive(c.endDate, period));
  const mrrUsd = activeClients.reduce((s, c) => s + c.services.reduce((a, x) => a + x.monthlyFeeUsd, 0), 0);

  // Charts: revenue vs expenses monthly.
  const revVsExp = MONTH_NAMES.map((m, i) => {
    const p = { year: period.year, month: i + 1 };
    const rev = core.clients.reduce((s, c) => s + computeClientWaterfall({ startDate: c.startDate, endDate: c.endDate, billingType: c.billingType, paymentMethod: c.paymentMethod, txnFeeEnabled: c.txnFeeEnabled, services: c.services }, core.config, p).netRevenueInr, 0);
    const exp = expenses.filter((e) => e.periodMonth === i + 1).reduce((s, e) => s + (e.amountInr ?? 0), 0);
    return { month: m, revenue: Math.round(rev), expenses: Math.round(exp), future: i + 1 > period.month };
  });

  // Allocation donut (current period).
  const pct = allocCfg ?? { deptReservePct: 50, businessDevPct: 30, productDevPct: 20, profitPct: 0 };
  const alloc = calculateAllocation({ netRevenueInr, deptReservePct: pct.deptReservePct, businessDevPct: pct.businessDevPct, productDevPct: pct.productDevPct, profitPct: pct.profitPct });
  const allocation = {
    totalInr: netRevenueInr,
    segments: [
      { name: `Dept Reserve ${pct.deptReservePct}%`, value: Math.round(alloc.deptReserveInr), color: "#3266AD" },
      { name: `BD ${pct.businessDevPct}%`, value: Math.round(alloc.businessDevInr), color: "#1D9E75" },
      { name: `Product ${pct.productDevPct}%`, value: Math.round(alloc.productDevInr), color: "#7F77DD" },
      { name: `Profit ${pct.profitPct}%`, value: Math.round(alloc.profitInr), color: "#BA7517" },
    ],
  };

  // Dept P&L summary.
  const wfByDeptCost = new Map<string, number>();
  const countByDept = new Map<string, number>();
  for (const r of active) {
    wfByDeptCost.set(r.departmentId, (wfByDeptCost.get(r.departmentId) ?? 0) + computeResourceCost(r, core.config, period).totalCostInr);
    countByDept.set(r.departmentId, (countByDept.get(r.departmentId) ?? 0) + 1);
  }
  const deptPnl = departments.map((d) => {
    const revenue = d.services.reduce((s, svc) => s + (serviceNetByService.get(svc.id) ?? 0), 0);
    const cost = wfByDeptCost.get(d.id) ?? 0;
    return { id: d.id, name: d.name, resources: countByDept.get(d.id) ?? 0, revenueInr: revenue, costInr: cost, surplusInr: calculateDeptRevenueShare(revenue) - cost };
  });

  // Dept charts (moved from Department Analysis): Cost vs Revenue + Workforce Cost Split.
  const costRevByDept = deptPnl.map((d) => ({ name: d.name, cost: Math.round(d.costInr), revenue: Math.round(d.revenueInr) }));
  const workforceSplit = deptPnl
    .filter((d) => d.costInr > 0)
    .map((d, i) => ({ name: d.name, value: Math.round(d.costInr), color: ["#3266AD", "#1D9E75", "#7F77DD", "#BA7517", "#D4537E", "#D85A30"][i % 6] }));

  // Top clients by net revenue.
  const topClients = core.clients
    .filter((c) => clientActive(c.endDate, period))
    .map((c) => ({ id: c.id, name: c.name, services: Array.from(new Set(c.services.map((s) => s.service.code))), monthlyFeeUsd: c.services.reduce((a, x) => a + x.monthlyFeeUsd, 0), netRevenueInr: waterfalls.get(c.id)!.netRevenueInr }))
    .sort((a, b) => b.netRevenueInr - a.netRevenueInr)
    .slice(0, 6);

  // Capacity alerts.
  const order: Record<string, number> = { OVER_CAPACITY: 0, SEVERELY_UNDER: 1, UNDER_UTILISED: 2, HEALTHY: 3 };
  const alerts = core.resources
    .filter((r) => r.utilisationLogs.length > 0)
    .map((r) => {
      const total = r.utilisationLogs.reduce((s, l) => s + l.totalHoursPerDay, 0);
      const pctU = (total / core.config.available_hrs_per_day) * 100;
      const status = pctU > 100 ? "OVER_CAPACITY" : pctU >= 80 ? "HEALTHY" : pctU >= 40 ? "UNDER_UTILISED" : "SEVERELY_UNDER";
      return { id: r.id, name: r.name, department: r.department.name, utilisationPct: pctU, status };
    })
    .sort((a, b) => order[a.status] - order[b.status])
    .slice(0, 8);

  return NextResponse.json({
    period,
    financial: { totalServiceCostUsd, grossRevenueUsd, netRevenueUsd, netRevenueInr, totalExpensesInr, netProfitInr, abbieRoyaltyUsd, reserveFundUsd },
    operations: { activeClients: activeClients.length, mrrUsd, activeResources: active.length, billableResources: active.filter((r) => r.isBillable).length },
    cost: { salaryInr, fullyLoadedInr, toolInr, overheadInr },
    charts: { revVsExp, allocation, costRevByDept, workforceSplit, costByCostCentre, salaryTrend },
    capacity,
    deptPnl, topClients, alerts,
    rates: core.rates,
  });
  void usdToInrRevenue;
}
