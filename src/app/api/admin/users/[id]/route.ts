import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole, badRequest } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

const ADMIN = ["ADMIN"];

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "FINANCE", "VIEWER"]).optional(),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid user payload");
  const d = parsed.data;

  const before = await prisma.user.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (d.email && d.email.toLowerCase() !== before.email) {
    const dup = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (dup) return badRequest("Email already in use");
  }
  if ((d.role ?? before.role) === "MANAGER" && !(d.departmentId ?? before.departmentId)) {
    return badRequest("Department required for Manager");
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.email !== undefined ? { email: d.email.toLowerCase() } : {}),
      ...(d.password ? { hashedPassword: await bcrypt.hash(d.password, 12) } : {}),
      ...(d.role !== undefined ? { role: d.role } : {}),
      ...(d.departmentId !== undefined ? { departmentId: d.departmentId || null } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
    },
  });
  await createAuditLog({ userId: u.user.id, entity: "User", entityId: updated.id, action: d.password ? "PASSWORD_CHANGED" : "UPDATE", before: { role: before.role, isActive: before.isActive }, after: { role: updated.role, isActive: updated.isActive } });
  return NextResponse.json({ data: { id: updated.id } });
}
