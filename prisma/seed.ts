/**
 * Seed for Aeon Ops Controller.
 *
 * Idempotent: every record uses a stable id and upsert, so this can be re-run.
 *
 * NOTE ON RESOURCES: the brief lists 10 resources explicitly and says to seed
 * "all 26 from the Excel salary sheet". That spreadsheet is not available in
 * this environment, so the 10 documented resources are seeded with their exact
 * values and 16 additional resources are seeded as clearly-marked PLACEHOLDERS
 * (employeeNumber CL1xxxx, generic associate profiles) purely so the app has a
 * realistic record count for development. Replace these once the Excel is on hand.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MON_FRI = [1, 2, 3, 4, 5];
const EFFECTIVE = new Date("2026-01-01T00:00:00.000Z");

async function seedSystemConfig() {
  const values: Record<string, number> = {
    usd_inr_fixed_rate: 91,
    usd_inr_market_rate: 84,
    expense_markup_b: 2,
    skydo_markup: 2,
    expense_markup_d: 4,
    skydo_fee_pct: 2,
    abbie_royalty_pct: 10,
    reserve_fund_pct: 15,
    card_txn_fee_pct: 4,
    ach_txn_fee_pct: 1.5,
    stripe_card_pct: 2.5,
    stripe_card_fixed: 0.3,
    stripe_ach_pct: 0.8,
    stripe_ach_cap: 5.0,
    overhead_pct: 10,
    overhead_enabled: 1,
    working_days_per_month: 22,
    available_hrs_per_day: 8,
    laptop_amortisation_months: 36,
  };

  for (const [configKey, configValue] of Object.entries(values)) {
    await prisma.systemConfig.upsert({
      where: { configKey },
      update: { configValue: configValue as Prisma.InputJsonValue, effectiveFrom: EFFECTIVE },
      create: {
        configKey,
        configValue: configValue as Prisma.InputJsonValue,
        effectiveFrom: EFFECTIVE,
      },
    });
  }
  return Object.keys(values).length;
}

async function seedAllocation() {
  const configs = [
    { year: 2026, deptReservePct: 50, businessDevPct: 30, productDevPct: 20, profitPct: 0 },
    { year: 2027, deptReservePct: 40, businessDevPct: 25, productDevPct: 15, profitPct: 20 },
  ];
  for (const c of configs) {
    await prisma.allocationConfig.upsert({
      where: { year: c.year },
      update: c,
      create: c,
    });
  }
  return configs.length;
}

const DEPTS = [
  { id: "dept-af", name: "Accounts & Finance", category: "CLIENT_FACING" as const },
  { id: "dept-pc", name: "Payroll & Compliance", category: "CLIENT_FACING" as const },
  { id: "dept-ta", name: "Talent Acquisition", category: "CLIENT_FACING" as const },
  { id: "dept-vo", name: "Virtual Operations", category: "CLIENT_FACING" as const },
  { id: "dept-bd", name: "Business Development", category: "BUSINESS_DEVELOPMENT" as const },
  { id: "dept-pd", name: "SaaS Development", category: "SAAS_DEVELOPMENT" as const },
];

const DEPT_CATEGORIES = [
  { key: "CLIENT_FACING", name: "Client Facing" },
  { key: "ADMINISTRATION", name: "Administration" },
  { key: "BUSINESS_DEVELOPMENT", name: "Business Development" },
  { key: "INTERNAL", name: "Internal" },
  { key: "SAAS_DEVELOPMENT", name: "SaaS Development" },
];

async function seedDepartmentCategories() {
  for (const c of DEPT_CATEGORIES) {
    await prisma.departmentCategory.upsert({
      where: { key: c.key },
      update: { name: c.name, isBuiltIn: true },
      create: { key: c.key, name: c.name, isBuiltIn: true },
    });
  }
  return DEPT_CATEGORIES.length;
}

const COST_CENTRES = [
  { id: "cc-mgmt", name: "Aeon - Management", ms365RateInr: 900, zoomRateUsd: 16.5 },
  { id: "cc-ops", name: "Aeon - Operations", ms365RateInr: 900, zoomRateUsd: 0 },
  { id: "cc-prod", name: "Aeon - Product", ms365RateInr: 170, zoomRateUsd: 0 },
  { id: "cc-bd", name: "Aeon - Business Development", ms365RateInr: 170, zoomRateUsd: 16.5 },
];

async function seedDepartments() {
  for (const d of DEPTS) {
    await prisma.department.upsert({
      where: { id: d.id },
      update: { name: d.name, category: d.category },
      create: d,
    });
  }
  return DEPTS.length;
}

async function seedCostCentres() {
  for (const c of COST_CENTRES) {
    await prisma.costCentre.upsert({
      where: { id: c.id },
      update: { ms365RateInr: c.ms365RateInr, zoomRateUsd: c.zoomRateUsd },
      create: c,
    });
  }
  return COST_CENTRES.length;
}

interface ServiceSeed {
  id: string;
  code: string;
  name: string;
  deptId: string;
  ltFee: number;
  mtFee: number;
  activities: string[];
}

const SERVICES: ServiceSeed[] = [
  {
    id: "svc-bke",
    code: "BKE",
    name: "Bookkeeping",
    deptId: "dept-af",
    ltFee: 250,
    mtFee: 300,
    activities: ["QBO Txn", "Reconciliation", "Profitability Report", "Financial Statement"],
  },
  {
    id: "svc-idm",
    code: "IDM",
    name: "Invoice & Data Management",
    deptId: "dept-af",
    ltFee: 300,
    mtFee: 400,
    activities: ["Amazon Fleet Invoice", "Route Invoice", "Vendor Fleet Invoice", "Insurance Invoice"],
  },
  {
    id: "svc-far",
    code: "FAR",
    name: "Financial Analysis & Reporting",
    deptId: "dept-af",
    ltFee: 500,
    mtFee: 500,
    activities: ["Financial Reports with Analytical Insights"],
  },
  {
    id: "svc-pcm",
    code: "PCM",
    name: "Payroll & Compliance Management",
    deptId: "dept-pc",
    ltFee: 550,
    mtFee: 650,
    activities: [
      "ADP Payroll",
      "Timecard Approval",
      "PTO",
      "Manual Checks",
      "Garnishment",
      "Termination",
      "DA Profile",
      "Overtime Report",
      "Timecard Validation",
      "Block hours vs ADP",
    ],
  },
  {
    id: "svc-dra",
    code: "DRA",
    name: "Driver Recruitment Assistance",
    deptId: "dept-ta",
    ltFee: 800,
    mtFee: 950,
    activities: [
      "Complete Recruitment Assistance",
      "Amazon Audit Assistance",
      "Harassment Training",
      "Weekly Recruitment Dashboard",
      "Tracker",
    ],
  },
  {
    id: "svc-vas",
    code: "VAS",
    name: "Virtual Admin Services",
    deptId: "dept-ta",
    ltFee: 1000,
    mtFee: 1300,
    activities: [
      "Recruitment & Report",
      "HR Activities",
      "Amazon Audit",
      "Worker Comp & Unemployment",
      "OSHA & FMLA",
    ],
  },
  {
    id: "svc-vdo",
    code: "VDO",
    name: "Virtual Dispatch Operations",
    deptId: "dept-vo",
    ltFee: 1600,
    mtFee: 1800,
    activities: [
      "Dispatch Assistance",
      "Route Monitor",
      "RTS",
      "Sweeper & Rescue",
      "Violation & Scorecard Dispute",
      "Daily Opening & Closing Report",
    ],
  },
];

async function seedServices() {
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: { code: s.code, name: s.name, departmentId: s.deptId, costCentreId: "cc-ops" },
      create: {
        id: s.id,
        code: s.code,
        name: s.name,
        departmentId: s.deptId,
        costCentreId: "cc-ops",
      },
    });

    // Packages
    await prisma.servicePackage.upsert({
      where: { id: `pkg-${s.code}-lt` },
      update: { monthlyFeeUsd: s.ltFee, effectiveFrom: EFFECTIVE },
      create: {
        id: `pkg-${s.code}-lt`,
        serviceId: s.id,
        packageType: "LESS_THAN_25",
        monthlyFeeUsd: s.ltFee,
        effectiveFrom: EFFECTIVE,
      },
    });
    await prisma.servicePackage.upsert({
      where: { id: `pkg-${s.code}-mt` },
      update: { monthlyFeeUsd: s.mtFee, effectiveFrom: EFFECTIVE },
      create: {
        id: `pkg-${s.code}-mt`,
        serviceId: s.id,
        packageType: "MORE_THAN_25",
        monthlyFeeUsd: s.mtFee,
        effectiveFrom: EFFECTIVE,
      },
    });

    // Activities (replace to stay idempotent)
    await prisma.serviceActivity.deleteMany({ where: { serviceId: s.id } });
    for (const name of s.activities) {
      await prisma.serviceActivity.create({
        data: { serviceId: s.id, name, defaultExpectedHoursPerDay: 0 },
      });
    }

    // Default utilisation tiers per service.
    for (const t of DEFAULT_TIERS) {
      await prisma.utilisationTier.upsert({
        where: { serviceId_tierNumber_effectiveFrom: { serviceId: s.id, tierNumber: t.tierNumber, effectiveFrom: EFFECTIVE } },
        update: { maxTxnVolume: t.maxTxnVolume, hoursPerDay: t.hoursPerDay },
        create: { serviceId: s.id, tierNumber: t.tierNumber, maxTxnVolume: t.maxTxnVolume, hoursPerDay: t.hoursPerDay, effectiveFrom: EFFECTIVE },
      });
    }
  }
  return SERVICES.length;
}

const DEFAULT_TIERS = [
  { tierNumber: 1, maxTxnVolume: 10, hoursPerDay: 0.1 },
  { tierNumber: 2, maxTxnVolume: 15, hoursPerDay: 0.15 },
  { tierNumber: 3, maxTxnVolume: 30, hoursPerDay: 0.25 },
  { tierNumber: 4, maxTxnVolume: 50, hoursPerDay: 0.45 },
];

interface ResourceSeed {
  emp: string;
  name: string;
  title: string;
  deptId: string;
  ccId: string;
  salary: number;
  billable: boolean;
  joined: string;
  terminated?: string;
  placeholder?: boolean;
}

const RESOURCES: ResourceSeed[] = [
  // ---- Documented resources ----
  { emp: "CL00002", name: "Bharath Prasad G", title: "Manager", deptId: "dept-bd", ccId: "cc-mgmt", salary: 100000, billable: false, joined: "2025-01-01" },
  { emp: "CL00010", name: "Nihal Alphons", title: "Manager", deptId: "dept-af", ccId: "cc-mgmt", salary: 50000, billable: false, joined: "2025-01-01" },
  { emp: "CL00011", name: "Roshan Dsouza", title: "Manager", deptId: "dept-ta", ccId: "cc-mgmt", salary: 25000, billable: false, joined: "2025-01-01" },
  { emp: "CL10008", name: "Vidhi Bansal", title: "Specialist", deptId: "dept-ta", ccId: "cc-ops", salary: 30000, billable: true, joined: "2025-04-01" },
  { emp: "CL10009", name: "Manish Mangesh Honnavar", title: "Associate", deptId: "dept-pc", ccId: "cc-ops", salary: 20000, billable: true, joined: "2025-05-01" },
  { emp: "CL10010", name: "Sunil Narayan Shetty", title: "Associate", deptId: "dept-pc", ccId: "cc-ops", salary: 20000, billable: true, joined: "2025-05-01" },
  { emp: "CL10011", name: "Tanya Garg", title: "Executive", deptId: "dept-af", ccId: "cc-ops", salary: 28750, billable: true, joined: "2025-06-01", terminated: "2026-02-28" },
  { emp: "CL10034", name: "Divya P", title: "Associate", deptId: "dept-af", ccId: "cc-ops", salary: 20000, billable: true, joined: "2025-09-01" },
  { emp: "CL10039", name: "Jecintha Simon", title: "Executive", deptId: "dept-vo", ccId: "cc-ops", salary: 22000, billable: true, joined: "2025-10-01" },
  { emp: "CL10040", name: "P S Rathan", title: "Associate", deptId: "dept-af", ccId: "cc-ops", salary: 20000, billable: true, joined: "2025-10-01" },
];

// ---- 16 PLACEHOLDER resources (replace with Excel data) ----
const PLACEHOLDER_NAMES = [
  "Aarav Mehta", "Diya Nair", "Kabir Rao", "Ananya Iyer", "Vivaan Joshi",
  "Ishika Reddy", "Arjun Pillai", "Saanvi Kulkarni", "Reyansh Menon", "Aadhya Bhat",
  "Krishna Patel", "Myra Shenoy", "Aryan Kamath", "Navya Desai", "Dhruv Hegde", "Tara Prabhu",
];
const PLACEHOLDER_DEPTS = ["dept-af", "dept-pc", "dept-ta", "dept-vo"];
PLACEHOLDER_NAMES.forEach((name, i) => {
  RESOURCES.push({
    emp: `CL100${String(12 + i).padStart(2, "0")}`,
    name,
    title: "Associate",
    deptId: PLACEHOLDER_DEPTS[i % PLACEHOLDER_DEPTS.length],
    ccId: "cc-ops",
    salary: 20000,
    billable: true,
    joined: "2025-07-01",
    placeholder: true,
  });
});

async function seedResources() {
  for (const r of RESOURCES) {
    const id = `res-${r.emp}`;
    await prisma.resource.upsert({
      where: { id },
      update: {
        name: r.name,
        title: r.title,
        departmentId: r.deptId,
        costCentreId: r.ccId,
        isBillable: r.billable,
        joinedDate: new Date(r.joined),
        terminatedDate: r.terminated ? new Date(r.terminated) : null,
      },
      create: {
        id,
        employeeNumber: r.emp,
        name: r.name,
        title: r.title,
        departmentId: r.deptId,
        costCentreId: r.ccId,
        isBillable: r.billable,
        joinedDate: new Date(r.joined),
        terminatedDate: r.terminated ? new Date(r.terminated) : null,
      },
    });

    // Revision effective from joining date
    await prisma.resourceRevision.upsert({
      where: { id: `rev-${r.emp}` },
      update: { baseSalary: r.salary, effectiveFrom: new Date(r.joined) },
      create: {
        id: `rev-${r.emp}`,
        resourceId: id,
        effectiveFrom: new Date(r.joined),
        baseSalary: r.salary,
        incentive: 0,
        allowance: 0,
        workingDays: MON_FRI,
        dailyWorkHours: 8,
      },
    });
  }

  // Department heads
  await prisma.department.update({ where: { id: "dept-bd" }, data: { headId: "res-CL00002" } });
  await prisma.department.update({ where: { id: "dept-af" }, data: { headId: "res-CL00010" } });
  await prisma.department.update({ where: { id: "dept-ta" }, data: { headId: "res-CL00011" } });

  return RESOURCES.length;
}

interface ClientSeed {
  id: string;
  name: string;
  start: string;
  end?: string;
  billingType: "LEGACY" | "NEW";
  method: "CARD" | "ACH";
  discountPct: number;
  services: Array<{ code: string; pkg: "LESS_THAN_25" | "MORE_THAN_25"; fee: number }>;
}

const CLIENTS: ClientSeed[] = [
  {
    id: "cl-harmony", name: "Harmony Logistics LLC", start: "2025-11-10", billingType: "LEGACY", method: "ACH", discountPct: 20,
    services: [
      { code: "BKE", pkg: "LESS_THAN_25", fee: 250 },
      { code: "IDM", pkg: "LESS_THAN_25", fee: 300 },
      { code: "PCM", pkg: "LESS_THAN_25", fee: 550 },
      { code: "DRA", pkg: "LESS_THAN_25", fee: 800 },
    ],
  },
  {
    id: "cl-munn", name: "Munn Express Delivery", start: "2025-11-14", end: "2026-02-28", billingType: "LEGACY", method: "CARD", discountPct: 10,
    services: [{ code: "IDM", pkg: "MORE_THAN_25", fee: 400 }],
  },
  {
    id: "cl-pria", name: "PRIA Logistics", start: "2025-12-01", end: "2026-05-31", billingType: "LEGACY", method: "ACH", discountPct: 0,
    services: [{ code: "DRA", pkg: "MORE_THAN_25", fee: 950 }],
  },
  {
    id: "cl-blueleaf", name: "Blue Leaf Logistics", start: "2025-12-29", billingType: "LEGACY", method: "CARD", discountPct: 10,
    services: [
      { code: "IDM", pkg: "LESS_THAN_25", fee: 300 },
      { code: "PCM", pkg: "LESS_THAN_25", fee: 550 },
    ],
  },
  {
    id: "cl-jsb", name: "JSB Logistics Corporation", start: "2026-01-26", billingType: "LEGACY", method: "ACH", discountPct: 0,
    services: [{ code: "IDM", pkg: "MORE_THAN_25", fee: 400 }],
  },
  {
    id: "cl-semper", name: "Semper Logistic LLC", start: "2026-03-10", billingType: "LEGACY", method: "ACH", discountPct: 0,
    services: [
      { code: "IDM", pkg: "MORE_THAN_25", fee: 400 },
      { code: "PCM", pkg: "MORE_THAN_25", fee: 650 },
      { code: "DRA", pkg: "MORE_THAN_25", fee: 950 },
    ],
  },
  {
    id: "cl-blueleaf-dra", name: "Blue Leaf Logistics (DRA)", start: "2026-03-09", billingType: "LEGACY", method: "CARD", discountPct: 10,
    services: [{ code: "DRA", pkg: "LESS_THAN_25", fee: 800 }],
  },
  {
    id: "cl-anc", name: "A & C Logistics LLC", start: "2026-05-10", billingType: "LEGACY", method: "CARD", discountPct: 0,
    services: [{ code: "VAS", pkg: "LESS_THAN_25", fee: 1000 }],
  },
];

async function seedClients() {
  const codeToServiceId: Record<string, string> = Object.fromEntries(
    SERVICES.map((s) => [s.code, s.id])
  );

  for (const c of CLIENTS) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        startDate: new Date(c.start),
        endDate: c.end ? new Date(c.end) : null,
        billingType: c.billingType,
        paymentMethod: c.method,
      },
      create: {
        id: c.id,
        name: c.name,
        startDate: new Date(c.start),
        endDate: c.end ? new Date(c.end) : null,
        billingType: c.billingType,
        paymentMethod: c.method,
      },
    });

    for (const svc of c.services) {
      const csId = `cs-${c.id}-${svc.code}`;
      await prisma.clientService.upsert({
        where: { id: csId },
        update: {
          packageType: svc.pkg,
          monthlyFeeUsd: svc.fee,
          discountMode: "PER_PACKAGE",
          discountPct: c.discountPct,
        },
        create: {
          id: csId,
          clientId: c.id,
          serviceId: codeToServiceId[svc.code],
          packageType: svc.pkg,
          monthlyFeeUsd: svc.fee,
          discountMode: "PER_PACKAGE",
          discountPct: c.discountPct,
        },
      });
    }
  }
  return CLIENTS.length;
}

async function seedAdmin() {
  const hashedPassword = await bcrypt.hash("Bharath25", 12);
  await prisma.user.upsert({
    where: { email: "bharathprasad@aeonsynergies.com" },
    update: { name: "Bharath Prasad G", role: "ADMIN", isActive: true },
    create: {
      id: "user-admin",
      email: "bharathprasad@aeonsynergies.com",
      hashedPassword,
      name: "Bharath Prasad G",
      role: "ADMIN",
      isActive: true,
    },
  });
  return 1;
}

async function main() {
  const counts: Record<string, number> = {};
  counts.systemConfig = await seedSystemConfig();
  counts.allocationConfig = await seedAllocation();
  counts.departments = await seedDepartments();
  counts.deptCategories = await seedDepartmentCategories();
  counts.costCentres = await seedCostCentres();
  counts.services = await seedServices();
  counts.resources = await seedResources();
  counts.clients = await seedClients();
  counts.adminUsers = await seedAdmin();

  console.log("Seed complete. Record counts:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(18)} ${v}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
