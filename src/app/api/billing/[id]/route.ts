import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, writeAudit, badRequest } from "@/lib/session";

const ADMIN = ["ADMIN"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const record = await prisma.billingRecord.findUnique({
    where: { id: params.id },
    include: { client: { select: { id: true, name: true, billingType: true, paymentMethod: true, txnFeeEnabled: true, endDate: true } } },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: record });
}

const numeric = z.number().optional();
const patchSchema = z.object({
  totalServiceCostUsd: numeric, proratedFeeUsd: numeric, discountUsd: numeric, discountedFeeUsd: numeric,
  txnFeeUsd: numeric, netServiceCostUsd: numeric, stripeFeeUsd: numeric, grossRevenueUsd: numeric,
  abbieRoyaltyUsd: numeric, reserveFundUsd: numeric, netRevenueUsd: numeric, skydoFeeUsd: numeric,
  netUsdToConvert: numeric, usdInrRate: numeric, netRevenueInr: numeric,
  reason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid billing payload");

  const before = await prisma.billingRecord.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status === "FINALISED") return badRequest("Finalised records cannot be edited");

  const { reason, ...fields } = parsed.data;
  const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

  const updated = await prisma.billingRecord.update({ where: { id: params.id }, data });
  await writeAudit({ userId: u.user.id, entity: "BillingRecord", entityId: updated.id, action: "OVERRIDE", before, after: { ...updated, reason } });
  return NextResponse.json({ data: updated });
}
