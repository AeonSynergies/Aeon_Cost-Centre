import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/** Global activities library across all services. */
export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const activities = await prisma.serviceActivity.findMany({
    include: { service: { select: { id: true, code: true, name: true } } },
    orderBy: [{ service: { code: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json({
    data: activities.map((a) => ({ id: a.id, name: a.name, defaultExpectedHoursPerDay: a.defaultExpectedHoursPerDay, serviceId: a.serviceId, serviceCode: a.service.code, serviceName: a.service.name })),
  });
}
