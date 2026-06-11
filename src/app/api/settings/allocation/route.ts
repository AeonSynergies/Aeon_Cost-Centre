import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";
import { validateAllocationPcts } from "@/lib/engines/allocationEngine";

const WRITE = ["ADMIN", "MANAGER"];

const schema = z.object({
  year: z.number().int(),
  deptReservePct: z.number().min(0).max(100),
  businessDevPct: z.number().min(0).max(100),
  productDevPct: z.number().min(0).max(100),
  profitPct: z.number().min(0).max(100),
});

export async function POST(req: Request) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid allocation payload");
  const d = parsed.data;

  if (!validateAllocationPcts(d)) return badRequest("Allocation percentages must sum to 100");

  const saved = await prisma.allocationConfig.upsert({
    where: { year: d.year },
    update: { deptReservePct: d.deptReservePct, businessDevPct: d.businessDevPct, productDevPct: d.productDevPct, profitPct: d.profitPct },
    create: d,
  });
  await writeAudit({ userId: u.user.id, entity: "AllocationConfig", entityId: String(d.year), action: "UPDATE", after: saved });
  return NextResponse.json({ data: saved });
}
