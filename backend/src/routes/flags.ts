import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { requireRole, requireApproval } from '../middleware/rbac.js';
import { createNotification, notifyAllAdmins } from '../services/notifications.js';
import { z } from 'zod';

const createFlagSchema = z.object({
    clientId: z.string().min(1),
    reason: z.string().min(1).max(2000),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
});

const updateFlagSchema = z.object({
    status: z.enum(['open', 'reviewing', 'resolved']).optional(),
    reason: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export async function flagRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Flag Client for Review ─────────────────────────────────
    app.post('/', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const advisorId = request.user.userId;
        const { clientId, reason, priority } = createFlagSchema.parse(request.body);

        // Validate relationship
        const relationship = await prisma.advisorClient.findFirst({
            where: { advisorId, clientId },
        });

        if (!relationship) {
            return reply.status(403).send({ error: 'This client is not assigned to you' });
        }

        const flag = await prisma.clientFlag.create({
            data: { advisorId, clientId, reason, priority },
            include: {
                advisor: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
            },
        });

        // Notify all admins
        const advisor = await prisma.user.findUnique({ where: { id: advisorId }, select: { name: true } });
        const client = await prisma.user.findUnique({ where: { id: clientId }, select: { name: true } });
        await notifyAllAdmins(
            'Client Flagged for Review',
            `${advisor?.name || 'An advisor'} flagged ${client?.name || 'a client'} (${priority} priority): ${reason.substring(0, 100)}`,
            priority === 'critical' ? 'ERROR' : 'WARNING',
            { type: 'client_flag', flagId: flag.id, advisorId, clientId, priority }
        );

        return reply.send(flag);
    });

    // ─── List Flags ─────────────────────────────────────────────
    app.get('/', {
        preHandler: [requireRole('ADVISOR', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const userId = request.user.userId;
        const role = request.user.role;
        const { status, priority, limit = '20', offset = '0' } = request.query as {
            status?: string; priority?: string; limit?: string; offset?: string;
        };

        let where: any = {};

        if (role === 'ADVISOR') {
            where.advisorId = userId;
        }

        if (status) where.status = status;
        if (priority) where.priority = priority;

        const flags = await prisma.clientFlag.findMany({
            where,
            include: {
                advisor: { select: { id: true, name: true, avatarUrl: true } },
                client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        const total = await prisma.clientFlag.count({ where });

        return reply.send({ flags, total });
    });

    // ─── Update Flag ────────────────────────────────────────────
    app.put('/:id', {
        preHandler: [requireRole('ADVISOR', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;
        const role = request.user.role;
        const updates = updateFlagSchema.parse(request.body);

        const flag = await prisma.clientFlag.findFirst({
            where: role === 'ADMIN' ? { id } : { id, advisorId: userId },
        });

        if (!flag) {
            return reply.status(404).send({ error: 'Flag not found' });
        }

        const data: any = { ...updates };
        if (updates.status === 'resolved') {
            data.resolvedAt = new Date();
            data.resolvedBy = userId;
        }

        const updated = await prisma.clientFlag.update({
            where: { id },
            data,
            include: {
                advisor: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
            },
        });

        return reply.send(updated);
    });
}
