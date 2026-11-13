import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { createTranslationHook } from '../middleware/translate.js';

export async function notificationRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);
    // Translate notification text to user's language
    app.addHook('onSend', createTranslationHook({ fields: ['title', 'message', 'body'] }));

    // ─── List Notifications ─────────────────────────────────────
    app.get('/', async (request: any, reply) => {
        const userId = request.user.userId;
        const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string };

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        // Get count of unread
        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        return reply.send({
            notifications,
            unreadCount
        });
    });

    // ─── Get Unread Count ───────────────────────────────────────
    app.get('/counts', async (request: any, reply) => {
        const userId = request.user.userId;
        const count = await prisma.notification.count({
            where: { userId, isRead: false },
        });
        return reply.send({ count });
    });

    // ─── Mark as Read ───────────────────────────────────────────
    app.put('/read', async (request: any, reply) => {
        const userId = request.user.userId;
        const { ids } = request.body as { ids?: string[] };

        if (!ids || ids.length === 0) {
            // Mark all as read
            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true },
            });
        } else {
            // Mark specific IDs
            await prisma.notification.updateMany({
                where: { userId, id: { in: ids } },
                data: { isRead: true },
            });
        }

        return reply.send({ success: true });
    });

    // ─── Delete Notification ────────────────────────────────────
    app.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;

        const notif = await prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notif) {
            return reply.status(404).send({ error: 'Notification not found' });
        }

        await prisma.notification.delete({ where: { id } });
        return reply.send({ success: true });
    });
}
