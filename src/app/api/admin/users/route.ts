import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, badRequest } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { makeInvite } from "@/lib/invite";

const ADMIN = ["ADMIN"];

export async function GET() {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const [users, depts] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
  ]);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));
  const data = users.map((x) => ({
    id: x.id, name: x.name, email: x.email, role: x.role,
    departmentId: x.departmentId, departmentName: x.departmentId ? deptMap.get(x.departmentId) ?? null : null,
    isActive: x.isActive, lastLoginAt: x.lastLoginAt,
  }));
  return NextResponse.json({ data });
}

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "FINANCE", "VIEWER"]),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
}).refine((d) => d.role !== "MANAGER" || !!d.departmentId, { message: "Department required for Manager" });

export async function POST(req: Request) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? "Invalid user payload");
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (existing) return badRequest("Email already in use");

  // Invite flow: no admin-set password. User sets it via the invite link.
  const { token, inviteExpiresAt, url } = makeInvite();
  const created = await prisma.user.create({
    data: {
      name: d.name, email: d.email.toLowerCase(), hashedPassword: "",
      role: d.role, departmentId: d.departmentId || null, isActive: d.isActive,
      inviteToken: token, inviteExpiresAt,
    },
  });
  // No email service configured — log the link and return it for the UI to surface.
  console.log("INVITE LINK:", url);
  await createAuditLog({ userId: u.user.id, entity: "User", entityId: created.id, action: "CREATE", after: { name: created.name, email: created.email, role: created.role } });
  return NextResponse.json({ data: { id: created.id }, inviteUrl: url }, { status: 201 });
}
