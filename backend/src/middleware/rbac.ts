import { FastifyReply } from 'fastify';

// ─── Role-Based Access Control Middleware ────────────────────────
// Usage: preHandler: [app.authenticate, requireRole('ADMIN', 'ADVISOR')]

type Role = 'END_USER' | 'ADVISOR' | 'PARTNER' | 'ADMIN';

/**
 * Creates a Fastify preHandler that checks if the authenticated user
 * has one of the allowed roles. Must be used AFTER app.authenticate.
 */
export function requireRole(...allowedRoles: Role[]) {
    return async function roleGuard(request: any, reply: FastifyReply) {
        const userRole = request.user?.role;

        if (!userRole) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        if (!allowedRoles.includes(userRole)) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
                requiredRoles: allowedRoles,
                yourRole: userRole,
            });
        }
    };
}

/**
 * Checks if the authenticated user is accessing their own resource
 * OR has an elevated role (ADMIN/ADVISOR).
 */
export function requireOwnerOrRole(paramName: string = 'id', ...elevatedRoles: Role[]) {
    return async function ownerOrRoleGuard(request: any, reply: FastifyReply) {
        const userRole = request.user?.role;
        const userId = request.user?.userId;
        const resourceOwnerId = request.params?.[paramName];

        if (elevatedRoles.includes(userRole)) return;

        if (resourceOwnerId && resourceOwnerId !== userId) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'You can only access your own resources',
            });
        }
    };
}

// ─── Role Hierarchy ──────────────────────────────────────────────
const ROLE_HIERARCHY: Record<Role, number> = {
    END_USER: 0,
    ADVISOR: 1,
    PARTNER: 1,
    ADMIN: 2,
};

export function hasHigherOrEqualRole(actorRole: Role, targetRole: Role): boolean {
    return ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole];
}

// ─── Advisor Tier Check ──────────────────────────────────────────
type Tier = 'FREE' | 'PREMIUM';

/**
 * Checks if the advisor has the required tier.
 * Reads the tier from the database (not the JWT) so that an admin's tier
 * change takes effect immediately and a stale token can never grant PREMIUM.
 * Must be used on routes already protected by requireRole('ADVISOR').
 */
export function requireTier(minTier: Tier) {
    return async function tierGuard(request: any, reply: FastifyReply) {
        const user = request.user;

        if (user.role === 'ADMIN') return;

        if (user.role !== 'ADVISOR') {
            return reply.status(403).send({ error: 'Tier check only applies to advisors' });
        }

        const { prisma } = await import('../server.js');
        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { tier: true },
        });
        const tier = dbUser?.tier ?? 'FREE';

        if (minTier === 'PREMIUM' && tier !== 'PREMIUM') {
            return reply.status(403).send({
                error: 'Premium Feature',
                message: 'This feature requires a Premium Advisor subscription.',
            });
        }
    };
}

// ─── Approval Check (DB-backed) ───────────────────────────────────
/**
 * Checks if the authenticated user's account is APPROVED by querying the database.
 * Using DB lookup instead of JWT to ensure revocations take effect immediately.
 */
export function requireApproval() {
    return async function approvalGuard(request: any, reply: FastifyReply) {
        if (request.user?.role === 'ADMIN') return;

        // Always read from DB so that admin suspensions/rejections take effect immediately
        // instead of waiting for the 30-day JWT to expire.
        const { prisma } = await import('../server.js');
        const dbUser = await prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { approvalStatus: true, isActive: true },
        });

        if (!dbUser) {
            return reply.status(401).send({ error: 'User not found' });
        }

        if (!dbUser.isActive) {
            return reply.status(403).send({
                error: 'Account Deactivated',
                message: 'Your account has been deactivated. Contact support.',
            });
        }

        if (dbUser.approvalStatus !== 'APPROVED') {
            return reply.status(403).send({
                error: 'Account Pending Approval',
                message: 'Your account is currently under review or has not been approved.',
                approvalStatus: dbUser.approvalStatus,
            });
        }
    };
}
