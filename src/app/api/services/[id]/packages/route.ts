import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const packages = await prisma.servicePackage.findMany({
    where: { serviceId: params.id },
    orderBy: { packageType: "asc" },
  });
  return NextResponse.json({ data: packages });
}

const schema = z.object({
  packageType: z.enum(["LESS_THAN_25", "MORE_THAN_25"]),
  monthlyFeeUsd: z.number().min(0),
  effectiveFrom: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid package payload");

  const created = await prisma.servicePackage.create({
    data: {
      serviceId: params.id,
      packageType: parsed.data.packageType,
      monthlyFeeUsd: parsed.data.monthlyFeeUsd,
      effectiveFrom: new Date(parsed.data.effectiveFrom),
    },
  });
  await writeAudit({ userId: u.user.id, entity: "ServicePackage", entityId: created.id, action: "CREATE", after: created });
  return NextResponse.json({ data: created }, { status: 201 });
}
