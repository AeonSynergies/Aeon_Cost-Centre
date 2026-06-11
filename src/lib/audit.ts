import { prisma } from "@/lib/prisma";

/**
 * Canonical audit-log writer. Best-effort: never throws into the request path.
 * (lib/session.ts#writeAudit delegates here.)
 */
export async function createAuditLog(params: {
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  resourceId?: string | null;
  before?: object | null;
  after?: object | null;
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
