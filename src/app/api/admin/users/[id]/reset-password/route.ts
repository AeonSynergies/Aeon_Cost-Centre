import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { makeInvite } from "@/lib/invite";

const ADMIN = ["ADMIN"];

/** Admin-initiated password reset: generates a fresh invite/reset token + URL. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireRole(ADMIN);
  if ("error" in u) return u.error;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { token, inviteExpiresAt, url } = makeInvite();
  await prisma.user.update({ where: { id: params.id }, data: { inviteToken: token, inviteExpiresAt } });
  console.log("RESET LINK:", url);
  await createAuditLog({ userId: u.user.id, entity: "User", entityId: params.id, action: "UPDATE", after: { resetRequested: true } });
  return NextResponse.json({ resetUrl: url });
}
