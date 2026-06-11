import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSystemConfig } from "@/lib/config";
import { computeResourceCost, currentPeriod, type Period } from "@/lib/metrics";
import { calculateAllocation } from "@/lib/engines/allocationEngine";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CLIENT_FACING_KEYS = ["dept-af", "dept-pc", "dept-ta", "dept-vo"]; // seeded ids

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
  const config = await getSystemConfig();

  const [allocCfg, billing, expenses, clients, resources, departments] = await Promise.all([
    prisma.allocationConfig.findUnique({ where: { year } }),
    prisma.billingRecord.findMany({ where: { periodYear: year } }),
    prisma.expense.findMany({ where: { periodYear: year } }),
    prisma.client.findMany({ include: { services: { include: { service: { select: { id: true, departmentId: true } } } } } }),
    prisma.resource.findMany({
      include: {
        revisions: true, costCentre: true, extraCosts: true,
        department: { select: { id: true, name: true } },
        assignments: { include: { service: { select: { id: true, code: true } } } },
      },
    }),
    prisma.department.findMany({ select: { id: true, name: true, category: true } }),
  ]);

  const pct = allocCfg ?? { deptReservePct: 50, businessDevPct: 30, productDevPct: 20, profitPct: 0 };
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const deptById = new Map(departments.map((d) => [d.id, d]));

  // ---- Department allocation (monthly) ----
  const deptMonthly = MONTHS.map((mName, i) => {
    const month = i + 1;
    const recs = billing.filter((b) => b.periodMonth === month);
    const netRevenue = recs.reduce((s, b) => s + b.netRevenueInr, 0);
    const alloc = calculateAllocation({ netRevenueInr: netRevenue, deptReservePct: pct.deptReservePct, businessDevPct: pct.businessDevPct, productDevPct: pct.productDevPct, profitPct: pct.profitPct });

    // Per client-facing dept revenue (for the four shares).
    const deptRev: Record<string, number> = { "dept-af": 0, "dept-pc": 0, "dept-ta": 0, "dept-vo": 0 };
    for (const b of recs) {
      const client = clientById.get(b.clientId);
      if (!client) continue;
      const totalFee = client.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
      if (totalFee <= 0) continue;
      for (const cs of client.services) {
        if (deptRev[cs.service.departmentId] !== undefined) {
          deptRev[cs.service.departmentId] += b.netRevenueInr * (cs.monthlyFeeUsd / totalFee);
        }
      }
    }
    const totalCfRev = Object.values(deptRev).reduce((s, x) => s + x, 0);
    const shareFor = (id: string) => (totalCfRev > 0 ? alloc.deptReserveInr * (deptRev[id] / totalCfRev) : 0);

    // Actual spend per bucket from expenses (mapped via dept category).
    const monthExp = expenses.filter((e) => e.periodMonth === month);
    let deptActual = 0, bdActual = 0, productActual = 0;
    for (const e of monthExp) {
      const amt = e.amountInr ?? 0;
      const cat = e.departmentId ? deptById.get(e.departmentId)?.category ?? "INTERNAL" : "INTERNAL";
      const b = bucketForCategory(cat);
      if (b === "bd") bdActual += amt; else if (b === "product") productActual += amt; else deptActual += amt;
    }

    return {
      month: mName,
      netRevenueInr: netRevenue,
      deptReserveBudget: alloc.deptReserveInr,
      deptReserveActual: deptActual,
      afShare: shareFor("dept-af"),
      pcShare: shareFor("dept-pc"),
      taShare: shareFor("dept-ta"),
      voShare: shareFor("dept-vo"),
      bdBudget: alloc.businessDevInr,
      bdActual,
      productBudget: alloc.productDevInr,
      productActual,
      profitBudget: alloc.profitInr,
      profitActual: 0,
    };
  });

  const yr = (k: keyof (typeof deptMonthly)[number]) => deptMonthly.reduce((s, m) => s + (m[k] as number), 0);
  const buckets = [
    { key: "Dept Reserve", pct: pct.deptReservePct, budget: yr("deptReserveBudget"), actual: yr("deptReserveActual") },
    { key: "Business Dev", pct: pct.businessDevPct, budget: yr("bdBudget"), actual: yr("bdActual") },
    { key: "Product", pct: pct.productDevPct, budget: yr("productBudget"), actual: yr("productActual") },
    { key: "Profit", pct: pct.profitPct, budget: yr("profitBudget"), actual: yr("profitActual") },
  ];
  const totalNetRevenue = yr("netRevenueInr");
  const deptKpi = {
    totalNetRevenueInr: totalNetRevenue,
    deptReserveInr: yr("deptReserveBudget"),
    companyPoolInr: yr("bdBudget") + yr("productBudget") + yr("profitBudget"),
    overBudgetCount: buckets.filter((b) => b.actual > b.budget && b.budget > 0).length,
  };

  // ---- Resource allocation (monthly) ----
  function isAssignmentActive(a: { assignedFrom: Date; assignedTo: Date | null }, p: Period): boolean {
    const end = new Date(p.year, p.month, 0);
    const start = new Date(p.year, p.month - 1, 1);
    return a.assignedFrom <= end && (!a.assignedTo || a.assignedTo >= start);
  }

  const resourceMonthly: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 12; i++) {
    const month = i + 1;
    const period = { year, month };
    const recs = billing.filter((b) => b.periodMonth === month);

    // serviceNet per (clientId|serviceId)
    const serviceNet = new Map<string, number>();
    for (const b of recs) {
      const client = clientById.get(b.clientId);
      if (!client) continue;
      const totalFee = client.services.reduce((s, x) => s + x.monthlyFeeUsd, 0);
      if (totalFee <= 0) continue;
      for (const cs of client.services) {
        serviceNet.set(`${b.clientId}|${cs.service.id}`, b.netRevenueInr * (cs.monthlyFeeUsd / totalFee));
      }
    }
    // billable resource count per (clientId|serviceId)
    const billableCount = new Map<string, number>();
    for (const r of resources) {
      if (!r.isBillable) continue;
      for (const a of r.assignments) {
        if (!isAssignmentActive(a, period)) continue;
        const key = `${a.clientId}|${a.serviceId}`;
        billableCount.set(key, (billableCount.get(key) ?? 0) + 1);
      }
    }

    for (const r of resources) {
      const activeAssigns = r.assignments.filter((a) => isAssignmentActive(a, period));
      if (activeAssigns.length === 0) continue;
      let revenue = 0;
      const clientIds = new Set<string>();
      const codes = new Set<string>();
      for (const a of activeAssigns) {
        clientIds.add(a.clientId);
        codes.add(a.service.code);
        if (!r.isBillable) continue;
        const key = `${a.clientId}|${a.serviceId}`;
        const net = serviceNet.get(key) ?? 0;
        const cnt = billableCount.get(key) ?? 1;
        revenue += net / cnt;
      }
      const allotted = revenue * 0.5;
      const cost = computeResourceCost(r, config, period).totalCostInr;
      resourceMonthly.push({
        month: MONTHS[i],
        resourceId: r.id,
        resource: r.name,
        department: r.department.name,
        clients: clientIds.size,
        services: Array.from(codes),
        revenueInr: revenue,
        allottedInr: allotted,
        costInr: cost,
        surplusInr: allotted - cost,
        marginPct: allotted > 0 ? ((allotted - cost) / allotted) * 100 : 0,
      });
    }
  }

  const resourceSummary = {
    revenueInr: resourceMonthly.reduce((s, r) => s + (r.revenueInr as number), 0),
    allottedInr: resourceMonthly.reduce((s, r) => s + (r.allottedInr as number), 0),
    costInr: resourceMonthly.reduce((s, r) => s + (r.costInr as number), 0),
    netMarginInr: resourceMonthly.reduce((s, r) => s + (r.surplusInr as number), 0),
  };

  return NextResponse.json({
    year,
    department: { kpi: deptKpi, buckets, monthly: deptMonthly },
    resource: { summary: resourceSummary, monthly: resourceMonthly },
  });
}
