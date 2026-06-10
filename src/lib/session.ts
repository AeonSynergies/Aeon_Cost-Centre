import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId: string | null;
};

/** Returns the session user or a 401 response. */
export async function requireUser(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user: session.user as SessionUser };
}

/** Returns the session user if they hold one of the allowed roles, else 403. */
export async function requireRole(
  roles: string[]
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const res = await requireUser();
  if ("error" in res) return res;
  if (!roles.includes(res.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return res;
}

/** Write an audit log entry. Best-effort; never throws into the request path. */
export async function writeAudit(params: {
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        resourceId: params.resourceId ?? null,
        beforeJson: (params.before ?? undefined) as object | undefined,
        afterJson: (params.after ?? undefined) as object | undefined,
      },
    });
  } catch {
    // swallow — auditing must not break the mutation
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
