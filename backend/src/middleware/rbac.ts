import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ─── Role-Based Access Control Middleware ────────────────────────
// Usage: preHandler: [app.authenticate, requireRole('ADMIN', 'ADVISOR')]

type Role = 'END_USER' | 'ADVISOR' | 'PARTNER' | 'ADMIN';

/**
 * Creates a Fastify preHandler that checks if the authenticated user
 * has one of the allowed roles. Must be used AFTER app.authenticate.
 *
 * @param allowedRoles - One or more roles that are permitted
 * @returns Fastify preHandler function
 *
 * @example
 * // Admin-only route
 * app.get('/admin/users', {
 *   preHandler: [app.authenticate, requireRole('ADMIN')],
 * }, handler);
 *
 * @example
 * // Advisor or Admin
 * app.get('/clients', {
 *   preHandler: [app.authenticate, requireRole('ADVISOR', 'ADMIN')],
 * }, handler);
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
 * OR has an elevated role (ADMIN/ADVISOR). Useful for "view own profile
 * or admin can view anyone" patterns.
 *
 * @param paramName - The request param containing the resource owner's userId
 * @param elevatedRoles - Roles that bypass the ownership check
 */
export function requireOwnerOrRole(paramName: string = 'id', ...elevatedRoles: Role[]) {
    return async function ownerOrRoleGuard(request: any, reply: FastifyReply) {
        const userRole = request.user?.role;
        const userId = request.user?.userId;
        const resourceOwnerId = request.params?.[paramName];

        // Elevated roles can access any resource
        if (elevatedRoles.includes(userRole)) return;

        // Otherwise, must be the owner
        if (resourceOwnerId && resourceOwnerId !== userId) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'You can only access your own resources',
            });
        }
    };
}

// ─── Role Hierarchy Check ────────────────────────────────────────
const ROLE_HIERARCHY: Record<Role, number> = {
    END_USER: 0,
    ADVISOR: 1,
    PARTNER: 1,
    ADMIN: 2,
};

/**
 * Checks if `actorRole` has equal or higher privilege than `targetRole`.
 * Useful for preventing advisors from modifying admin accounts, etc.
 */
export function hasHigherOrEqualRole(actorRole: Role, targetRole: Role): boolean {
    return ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole];
}

// ─── Advisor Tier Check ──────────────────────────────────────────

type Tier = 'FREE' | 'PREMIUM';

/**
 * Checks if the advisor has the required tier.
 * Must be used on routes already protected by requireRole('ADVISOR').
 */
export function requireTier(minTier: Tier) {
    return async function tierGuard(request: any, reply: FastifyReply) {
        const user = request.user;

        // Admins bypass tier checks
        if (user.role === 'ADMIN') return;

        if (user.role !== 'ADVISOR') {
            return reply.status(403).send({ error: 'Tier check only applies to advisors' });
        }

        // Fetch full user to check tier (since JWT might be stale or not include tier)
        // In a real app, we might put tier in JWT to avoid this DB call
        // For now, assuming tier is in JWT payload for simplicity, or we fetch it.
        // Let's assume we need to fetch it to be safe.
        const { prisma } = await import('../server.js');
        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { tier: true }
        });

        if (!dbUser?.tier) {
            return reply.status(403).send({ error: 'Advisor has no tier assigned' });
        }

        if (minTier === 'PREMIUM' && dbUser.tier !== 'PREMIUM') {
            return reply.status(403).send({
                error: 'Premium Feature',
                message: 'This feature requires a Premium Advisor subscription.'
            });
        }
    };
}

// ─── Approval Check ──────────────────────────────────────────────

/**
 * Checks if the authenticated user's account is APPROVED.
 * Users with PENDING or REJECTED status will be blocked.
 */
export function requireApproval() {
    return async function approvalGuard(request: any, reply: FastifyReply) {
        // Admins bypass approval checks
        if (request.user?.role === 'ADMIN') return;

        const approvalStatus = request.user?.approvalStatus;

        if (approvalStatus !== 'APPROVED') {
            return reply.status(403).send({
                error: 'Account Pending Approval',
                message: 'Your account is currently under review or has not been approved.',
                approvalStatus,
            });
        }
    };
}
