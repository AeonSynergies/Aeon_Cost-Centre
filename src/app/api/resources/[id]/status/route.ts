import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAudit, badRequest } from "@/lib/session";

const WRITE = ["ADMIN", "MANAGER"];

const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TERMINATION"),
    effectiveDate: z.string().min(1),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("REACTIVATION"),
    effectiveDate: z.string().min(1),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("BILLABLE"),
    isBillable: z.boolean(),
    effectiveDate: z.string().min(1),
    reason: z.string().optional(),
  }),
]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(WRITE);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid status payload");
  const body = parsed.data;

  const before = await prisma.resource.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let data: Record<string, unknown> = {};
  // Termination also forces billable -> false (a terminated resource cannot be billable).
  if (body.type === "TERMINATION") data = { terminatedDate: new Date(body.effectiveDate), isBillable: false };
  // Reactivation only clears the termination date; billable stays as-is (deliberate decision).
  else if (body.type === "REACTIVATION") data = { terminatedDate: null };
  else data = { isBillable: body.isBillable };

  const updated = await prisma.resource.update({ where: { id: params.id }, data });

  // Auto-trigger: terminating a resource closes its active assignments on the
  // termination date.
  if (body.type === "TERMINATION") {
    const termDate = new Date(body.effectiveDate);
    await prisma.resourceAssignment.updateMany({
      where: {
        resourceId: params.id,
        OR: [{ assignedTo: null }, { assignedTo: { gt: termDate } }],
      },
      data: { assignedTo: termDate },
    });
  }

  const auditAfter =
    body.type === "TERMINATION"
      ? {
          terminatedDate: body.effectiveDate,
          isBillable: false,
          note: "Billable status automatically set to Non-billable on termination",
        }
      : updated;

  await writeAudit({
    userId: u.user.id,
    entity: "Resource",
    entityId: params.id,
    resourceId: params.id,
    action: body.type === "TERMINATION" ? "TERMINATED" : `STATUS_${body.type}`,
    before,
    after: auditAfter,
  });
  return NextResponse.json({ data: updated });
}
