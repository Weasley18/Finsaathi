import { prisma } from '../server';

// ─── Audit Logging ───────────────────────────────────────────────
// Records who did what to which resource for sensitive actions
// (approvals, role/tier changes, document access, account deletion).
// Never throws: an audit failure must not break the request itself.
export async function logAudit(
    request: any,
    action: string,
    resource: string,
    resourceId?: string | null,
    details?: Record<string, unknown>
): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: request?.user?.userId ?? null,
                action,
                resource,
                resourceId: resourceId ?? null,
                details: details ? JSON.stringify(details) : null,
                ip: request?.ip ?? null,
            },
        });
    } catch (err) {
        console.error('[Audit] Failed to write audit log:', err);
    }
}
