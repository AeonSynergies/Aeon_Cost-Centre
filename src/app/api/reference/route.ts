import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/api";

/** Minimal lists used to populate dropdowns across modals. */
export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const [departments, costCentres, services, clients, resources] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true, category: true }, orderBy: { name: "asc" } }),
    prisma.costCentre.findMany({ select: { id: true, name: true, departmentId: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({
      select: { id: true, code: true, name: true, departmentId: true, costCentreId: true, packages: { select: { packageType: true, monthlyFeeUsd: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.client.findMany({ select: { id: true, name: true, endDate: true }, orderBy: { name: "asc" } }),
    prisma.resource.findMany({ select: { id: true, name: true, employeeNumber: true }, orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({ departments, costCentres, services, clients, resources });
}
