import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { requireRole, requireApproval } from '../middleware/rbac.js';
import { createNotification } from '../services/notifications.js';
import { z } from 'zod';

const scheduleCallSchema = z.object({
    clientId: z.string().min(1),
    scheduledAt: z.string().min(1), // ISO datetime string
    duration: z.number().min(5).max(120).optional().default(30),
    notes: z.string().max(1000).optional(),
});

const updateCallSchema = z.object({
    scheduledAt: z.string().optional(),
    duration: z.number().min(5).max(120).optional(),
    notes: z.string().max(1000).optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'missed']).optional(),
});

export async function callRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Schedule a Call ────────────────────────────────────────
    app.post('/', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const advisorId = request.user.userId;
        const { clientId, scheduledAt, duration, notes } = scheduleCallSchema.parse(request.body);

        // Validate relationship
        const relationship = await prisma.advisorClient.findFirst({
            where: { advisorId, clientId },
        });

        if (!relationship) {
            return reply.status(403).send({ error: 'This client is not assigned to you' });
        }

        const call = await prisma.scheduledCall.create({
            data: {
                advisorId,
                clientId,
                scheduledAt: new Date(scheduledAt),
                duration,
                notes,
            },
            include: {
                advisor: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
            },
        });

        // Notify client
        const advisor = await prisma.user.findUnique({ where: { id: advisorId }, select: { name: true } });
        const dateStr = new Date(scheduledAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        await createNotification(
            clientId,
            'Call Scheduled',
            `${advisor?.name || 'Your advisor'} scheduled a ${duration}-minute call on ${dateStr}`,
            'INFO',
            { type: 'scheduled_call', callId: call.id, scheduledAt }
        );

        return reply.send(call);
    });

    // ─── List Calls ─────────────────────────────────────────────
    app.get('/', {
        preHandler: [requireRole('ADVISOR', 'END_USER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const userId = request.user.userId;
        const role = request.user.role;
        const { status, limit = '20', offset = '0' } = request.query as {
            status?: string; limit?: string; offset?: string;
        };

        let where: any = {};

        if (role === 'ADVISOR') {
            where.advisorId = userId;
        } else if (role === 'END_USER') {
            where.clientId = userId;
        }

        if (status) where.status = status;

        const calls = await prisma.scheduledCall.findMany({
            where,
            include: {
                advisor: { select: { id: true, name: true, avatarUrl: true, phone: true } },
                client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
            },
            orderBy: { scheduledAt: 'asc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        const total = await prisma.scheduledCall.count({ where });

        return reply.send({ calls, total });
    });

    // ─── Update Call ────────────────────────────────────────────
    app.put('/:id', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const advisorId = request.user.userId;
        const updates = updateCallSchema.parse(request.body);

        const call = await prisma.scheduledCall.findFirst({
            where: { id, advisorId },
        });

        if (!call) {
            return reply.status(404).send({ error: 'Call not found' });
        }

        const data: any = { ...updates };
        if (updates.scheduledAt) data.scheduledAt = new Date(updates.scheduledAt);

        const updated = await prisma.scheduledCall.update({
            where: { id },
            data,
            include: {
                advisor: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
            },
        });

        // Notify client of changes
        if (updates.status === 'cancelled') {
            const advisor = await prisma.user.findUnique({ where: { id: advisorId }, select: { name: true } });
            await createNotification(
                call.clientId,
                'Call Cancelled',
                `${advisor?.name || 'Your advisor'} cancelled the scheduled call`,
                'WARNING',
                { type: 'call_cancelled', callId: id }
            );
        } else if (updates.scheduledAt) {
            const advisor = await prisma.user.findUnique({ where: { id: advisorId }, select: { name: true } });
            const dateStr = new Date(updates.scheduledAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            });
            await createNotification(
                call.clientId,
                'Call Rescheduled',
                `${advisor?.name || 'Your advisor'} rescheduled the call to ${dateStr}`,
                'INFO',
                { type: 'call_rescheduled', callId: id, scheduledAt: updates.scheduledAt }
            );
        }

        return reply.send(updated);
    });

    // ─── Delete (Cancel) Call ───────────────────────────────────
    app.delete('/:id', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const advisorId = request.user.userId;

        const call = await prisma.scheduledCall.findFirst({
            where: { id, advisorId },
        });

        if (!call) {
            return reply.status(404).send({ error: 'Call not found' });
        }

        await prisma.scheduledCall.update({
            where: { id },
            data: { status: 'cancelled' },
        });

        // Notify client
        const advisor = await prisma.user.findUnique({ where: { id: advisorId }, select: { name: true } });
        await createNotification(
            call.clientId,
            'Call Cancelled',
            `${advisor?.name || 'Your advisor'} cancelled the scheduled call`,
            'WARNING',
            { type: 'call_cancelled', callId: id }
        );

        return reply.send({ success: true });
    });
}
