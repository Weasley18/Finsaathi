import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { requireRole, requireApproval } from '../middleware/rbac.js';
import { createNotification } from '../services/notifications.js';
import { z } from 'zod';

const createRecommendationSchema = z.object({
    clientId: z.string().min(1),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(5000),
    category: z.enum(['savings', 'investment', 'insurance', 'debt', 'general']),
});

export async function recommendationRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Send Recommendation ────────────────────────────────────
    app.post('/', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const advisorId = request.user.userId;
        const { clientId, title, content, category } = createRecommendationSchema.parse(request.body);

        // Validate advisor-client relationship
        const relationship = await prisma.advisorClient.findFirst({
            where: { advisorId, clientId },
        });

        if (!relationship) {
            return reply.status(403).send({ error: 'This client is not assigned to you' });
        }

        const recommendation = await prisma.recommendation.create({
            data: { advisorId, clientId, title, content, category },
            include: {
                advisor: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } },
            },
        });

        // Notify client
        const advisor = await prisma.user.findUnique({ where: { id: advisorId }, select: { name: true } });
        await createNotification(
            clientId,
            'New Recommendation',
            `${advisor?.name || 'Your advisor'} sent you a ${category} recommendation: ${title}`,
            'INFO',
            { type: 'recommendation', recommendationId: recommendation.id, category }
        );

        return reply.send(recommendation);
    });

    // ─── List Recommendations ───────────────────────────────────
    app.get('/', {
        preHandler: [requireRole('ADVISOR', 'END_USER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const userId = request.user.userId;
        const role = request.user.role;
        const { clientId, status, limit = '20', offset = '0' } = request.query as {
            clientId?: string; status?: string; limit?: string; offset?: string;
        };

        let where: any = {};

        if (role === 'ADVISOR') {
            where.advisorId = userId;
            if (clientId) where.clientId = clientId;
        } else if (role === 'END_USER') {
            where.clientId = userId;
        } else if (role === 'ADMIN') {
            if (clientId) where.clientId = clientId;
        }

        if (status) where.status = status;

        const recommendations = await prisma.recommendation.findMany({
            where,
            include: {
                advisor: { select: { id: true, name: true, avatarUrl: true } },
                client: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        const total = await prisma.recommendation.count({ where });

        return reply.send({ recommendations, total });
    });

    // ─── Update Recommendation Status ───────────────────────────
    app.put('/:id/status', {
        preHandler: [requireRole('END_USER'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;
        const { status } = z.object({
            status: z.enum(['viewed', 'accepted', 'dismissed']),
        }).parse(request.body);

        const recommendation = await prisma.recommendation.findFirst({
            where: { id, clientId: userId },
        });

        if (!recommendation) {
            return reply.status(404).send({ error: 'Recommendation not found' });
        }

        const updated = await prisma.recommendation.update({
            where: { id },
            data: { status },
        });

        // Notify advisor when client responds
        if (status === 'accepted' || status === 'dismissed') {
            const client = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            await createNotification(
                recommendation.advisorId,
                'Recommendation Update',
                `${client?.name || 'Your client'} ${status} your recommendation: ${recommendation.title}`,
                status === 'accepted' ? 'SUCCESS' : 'INFO',
                { type: 'recommendation_response', recommendationId: id, status }
            );
        }

        return reply.send(updated);
    });
}
