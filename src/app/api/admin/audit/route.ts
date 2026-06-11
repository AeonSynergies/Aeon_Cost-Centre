import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const ADMIN = ["ADMIN"];

export async function GET(req: Request) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const entity = sp.get("entity") || "";
  const userId = sp.get("userId") || "";
  const from = sp.get("from");
  const to = sp.get("to");

  const where: Prisma.AuditLogWhereInput = {};
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
  }

  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);
  const userMap = new Map(users.map((x) => [x.id, x.name]));
  const entities = Array.from(new Set((await prisma.auditLog.findMany({ select: { entity: true }, distinct: ["entity"] })).map((e) => e.entity)));

  const data = logs.map((l) => ({
    id: l.id, createdAt: l.createdAt, userName: userMap.get(l.userId) ?? l.userId,
    action: l.action, entity: l.entity, entityId: l.entityId,
    before: l.beforeJson, after: l.afterJson,
  }));

  return NextResponse.json({ data, entities, users: users.map((x) => ({ id: x.id, name: x.name })) });
}
