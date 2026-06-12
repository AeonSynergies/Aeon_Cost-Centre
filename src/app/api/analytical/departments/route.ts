import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeResourceCost, isResourceActive, currentPeriod, type Period } from "@/lib/metrics";
import { calculateDeptRevenueShare } from "@/lib/engines/revenueShareEngine";
import { inrToUsdDisplay } from "@/lib/engines/currencyEngine";
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

  const sp = new URL(req.url).searchParams;
  const departmentId = sp.get("departmentId") || "";
  const period = periodFromQuery(req.url);

  const core = await loadCore(period);
  const { serviceNetByService, waterfalls } = revenueMaps(core.clients, core.config, period);
  const rateD = core.rates.rateD;

  const departments = await prisma.department.findMany({
    include: {
      head: { select: { id: true, name: true } },
      services: { select: { id: true, code: true, costCentreId: true } },
    },
  });

  // Department-level expenses (tool + client costs) for the period.
  // Attribution: serviceId -> that service's dept; else clientId -> split by the
  // client's service fee weight across depts; else costCentreId -> split equally
  // across depts owning a service in that cost centre.
  const expenses = await prisma.expense.findMany({ where: { periodYear: period.year, periodMonth: period.month } });
  const svcDeptById = new Map<string, string>();
  const deptsByCostCentre = new Map<string, Set<string>>();
  for (const d of departments) for (const svc of d.services) {
    svcDeptById.set(svc.id, d.id);
    if (svc.costCentreId) {
      const set = deptsByCostCentre.get(svc.costCentreId) ?? new Set<string>();
      set.add(d.id);
      deptsByCostCentre.set(svc.costCentreId, set);
    }
  }
  const clientServiceWeights = new Map<string, { deptId: string; weight: number }[]>();
  for (const c of core.clients) {
    const total = c.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
    if (total <= 0) continue;
    clientServiceWeights.set(c.id, c.services.map((cs) => ({ deptId: cs.service.departmentId, weight: cs.monthlyFeeUsd / total })));
  }
  const expenseByDept = new Map<string, number>();
  const addDeptExpense = (deptId: string, amt: number) => expenseByDept.set(deptId, (expenseByDept.get(deptId) ?? 0) + amt);
  for (const e of expenses) {
    const amt = e.amountInr ?? 0;
    if (amt === 0) continue;
    if (e.serviceId && svcDeptById.has(e.serviceId)) {
      addDeptExpense(svcDeptById.get(e.serviceId)!, amt);
    } else if (e.clientId && clientServiceWeights.has(e.clientId)) {
      for (const w of clientServiceWeights.get(e.clientId)!) addDeptExpense(w.deptId, amt * w.weight);
    } else if (e.costCentreId && deptsByCostCentre.has(e.costCentreId)) {
      const set = deptsByCostCentre.get(e.costCentreId)!;
      const share = amt / set.size;
      for (const deptId of set) addDeptExpense(deptId, share);
    }
  }

  // Workforce cost per dept.
  const wfByDept = new Map<string, number>();
  const activeCountByDept = new Map<string, number>();
  for (const r of core.resources) {
    if (!isResourceActive(r, period)) continue;
    wfByDept.set(r.departmentId, (wfByDept.get(r.departmentId) ?? 0) + computeResourceCost(r, core.config, period).totalCostInr);
    activeCountByDept.set(r.departmentId, (activeCountByDept.get(r.departmentId) ?? 0) + 1);
  }

  const all = departments.map((d) => {
    const revenue = d.services.reduce((s, svc) => s + (serviceNetByService.get(svc.id) ?? 0), 0);
    const reserve = calculateDeptRevenueShare(revenue);
    const workforce = wfByDept.get(d.id) ?? 0;
    const toolAndClientCost = expenseByDept.get(d.id) ?? 0;
    const total = workforce + toolAndClientCost;
    const surplus = reserve - total;
    return {
      id: d.id, name: d.name, category: d.category, head: d.head?.name ?? null,
      activeResources: activeCountByDept.get(d.id) ?? 0,
      services: d.services.map((s) => s.code),
      revenueInr: revenue, revenueUsd: inrToUsdDisplay(revenue, rateD, 0),
      deptReserveInr: reserve,
      workforceCostInr: workforce, workforceCostUsd: inrToUsdDisplay(workforce, rateD, 0),
      toolCostInr: toolAndClientCost,
      totalDeptCostInr: total, totalDeptCostUsd: inrToUsdDisplay(total, rateD, 0),
      surplusInr: surplus, surplusUsd: inrToUsdDisplay(surplus, rateD, 0),
      marginPct: revenue > 0 ? (surplus / revenue) * 100 : 0,
    };
  });

  const rows = departmentId ? all.filter((d) => d.id === departmentId) : all;

  const kpi = {
    revenueInr: rows.reduce((s, d) => s + d.revenueInr, 0),
    costInr: rows.reduce((s, d) => s + d.totalDeptCostInr, 0),
    reserveInr: rows.reduce((s, d) => s + d.deptReserveInr, 0),
    surplusInr: rows.reduce((s, d) => s + d.surplusInr, 0),
  };

  const costRevChart = rows.map((d) => ({ name: d.name, cost: Math.round(d.totalDeptCostInr), revenue: Math.round(d.revenueInr) }));
  const workforceSplit = rows.filter((d) => d.workforceCostInr > 0).map((d) => ({ name: d.name, value: Math.round(d.workforceCostInr) }));

  // Supporting client-service breakdown.
  const deptIds = new Set(rows.map((d) => d.id));
  const breakdown: Array<Record<string, unknown>> = [];
  const deptNameById = new Map(departments.map((d) => [d.id, d.name]));
  for (const c of core.clients) {
    const totalFee = c.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
    if (totalFee <= 0) continue;
    const wf = waterfalls.get(c.id)!;
    for (const cs of c.services) {
      if (!deptIds.has(cs.service.departmentId)) continue;
      const net = wf.netRevenueInr * (cs.monthlyFeeUsd / totalFee);
      breakdown.push({
        clientId: c.id, client: c.name, billingType: c.billingType,
        serviceCode: cs.service.code, departmentName: deptNameById.get(cs.service.departmentId) ?? "",
        packageType: cs.packageType, monthlyFeeUsd: cs.monthlyFeeUsd,
        netRevenueInr: net, deptShareInr: calculateDeptRevenueShare(net),
        period: `${MONTH_NAMES[period.month - 1]} ${period.year}`,
        status: clientActive(c.endDate, period) ? "ACTIVE" : "CHURNED",
      });
    }
  }

  return NextResponse.json({ kpi, rows, charts: { costRevChart, workforceSplit }, breakdown });
}
