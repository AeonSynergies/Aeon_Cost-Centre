import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/** 32-char hex token + 48h expiry, plus the absolute accept-invite URL. */
export function makeInvite() {
  const token = crypto.randomBytes(16).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const base = process.env.NEXTAUTH_URL ?? "";
  const url = `${base}/auth/accept-invite?token=${token}`;
  return { token, inviteExpiresAt, url };
}

export type AcceptInviteResult = { ok: true; email: string } | { ok: false; error: string };

/**
 * Validate an invite/reset token and set the user's password.
 * Clears the token + expiry and stamps passwordSetAt. Shared by the
 * accept-invite server action and the REST endpoint.
 */
export async function setPasswordFromToken(token: string, password: string): Promise<AcceptInviteResult> {
  if (!token) return { ok: false, error: "Missing token" };
  if (!password || password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };

  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!user) return { ok: false, error: "Invalid or already-used link" };
  if (user.inviteExpiresAt && user.inviteExpiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Ask an admin for a new one." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword: await bcrypt.hash(password, 12),
      inviteToken: null,
      inviteExpiresAt: null,
      passwordSetAt: new Date(),
    },
  });
  return { ok: true, email: user.email };
}
