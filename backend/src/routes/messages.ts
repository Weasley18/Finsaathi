import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { requireRole, requireApproval } from '../middleware/rbac.js';
import { createNotification } from '../services/notifications.js';
import { z } from 'zod';

const sendMessageSchema = z.object({
    receiverId: z.string().min(1),
    content: z.string().min(1).max(5000),
});

export async function messageRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Send Direct Message ────────────────────────────────────
    app.post('/', {
        preHandler: [requireApproval()],
    }, async (request: any, reply) => {
        const senderId = request.user.userId;
        const senderRole = request.user.role;
        const { receiverId, content } = sendMessageSchema.parse(request.body);

        if (senderId === receiverId) {
            return reply.status(400).send({ error: 'Cannot message yourself' });
        }

        // Validate relationship: sender and receiver must be in an AdvisorClient pair
        const relationship = await prisma.advisorClient.findFirst({
            where: {
                OR: [
                    { advisorId: senderId, clientId: receiverId },
                    { advisorId: receiverId, clientId: senderId },
                ],
            },
        });

        if (!relationship && senderRole !== 'ADMIN') {
            return reply.status(403).send({ error: 'You can only message your assigned advisor or client' });
        }

        const message = await prisma.directMessage.create({
            data: { senderId, receiverId, content },
            include: {
                sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
            },
        });

        // Create notification for receiver
        const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
        await createNotification(
            receiverId,
            'New Message',
            `New message from ${sender?.name || 'Unknown'}`,
            'INFO',
            { type: 'direct_message', messageId: message.id, senderId }
        );

        return reply.send(message);
    });

    // ─── Get Conversations List ─────────────────────────────────
    app.get('/conversations', async (request: any, reply) => {
        const userId = request.user.userId;

        // Get all unique conversation partners
        const sent = await prisma.directMessage.findMany({
            where: { senderId: userId },
            select: { receiverId: true },
            distinct: ['receiverId'],
        });

        const received = await prisma.directMessage.findMany({
            where: { receiverId: userId },
            select: { senderId: true },
            distinct: ['senderId'],
        });

        const partnerIdsSet = new Set([
            ...sent.map((s: any) => s.receiverId),
            ...received.map((r: any) => r.senderId),
        ]);

        // Also include explicitly assigned advisors/clients even if no messages exist yet
        const relationships = await prisma.advisorClient.findMany({
            where: {
                OR: [
                    { clientId: userId },
                    { advisorId: userId },
                ]
            },
        });

        for (const rel of relationships) {
            const pid = rel.clientId === userId ? rel.advisorId : rel.clientId;
            partnerIdsSet.add(pid);
        }

        const partnerIds = Array.from(partnerIdsSet);

        // For each partner, get last message + unread count
        const conversations = await Promise.all(partnerIds.map(async (partnerId) => {
            const lastMessage = await prisma.directMessage.findFirst({
                where: {
                    OR: [
                        { senderId: userId, receiverId: partnerId },
                        { senderId: partnerId, receiverId: userId },
                    ],
                },
                orderBy: { createdAt: 'desc' },
            });

            const unreadCount = await prisma.directMessage.count({
                where: {
                    senderId: partnerId,
                    receiverId: userId,
                    isRead: false,
                },
            });

            const partner = await prisma.user.findUnique({
                where: { id: partnerId },
                select: { id: true, name: true, role: true, avatarUrl: true, phone: true, isActive: true },
            });

            return {
                partner,
                lastMessage,
                unreadCount,
            };
        }));

        // Sort by last message time desc
        conversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt?.getTime() || 0;
            const bTime = b.lastMessage?.createdAt?.getTime() || 0;
            return bTime - aTime;
        });

        return reply.send({ conversations });
    });

    // ─── Get Conversation with Specific User ────────────────────
    app.get('/:userId', async (request: any, reply) => {
        const currentUserId = request.user.userId;
        const { userId: partnerId } = request.params as { userId: string };
        const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };

        // Validate relationship
        const relationship = await prisma.advisorClient.findFirst({
            where: {
                OR: [
                    { advisorId: currentUserId, clientId: partnerId },
                    { advisorId: partnerId, clientId: currentUserId },
                ],
            },
        });

        if (!relationship && request.user.role !== 'ADMIN') {
            return reply.status(403).send({ error: 'No relationship with this user' });
        }

        const where = {
            OR: [
                { senderId: currentUserId, receiverId: partnerId },
                { senderId: partnerId, receiverId: currentUserId },
            ],
        };

        const totalCount = await prisma.directMessage.count({ where });

        const messages = await prisma.directMessage.findMany({
            where,
            include: {
                sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        // Mark received messages as read
        await prisma.directMessage.updateMany({
            where: {
                senderId: partnerId,
                receiverId: currentUserId,
                isRead: false,
            },
            data: { isRead: true },
        });

        // Get partner info
        const partner = await prisma.user.findUnique({
            where: { id: partnerId },
            select: { id: true, name: true, role: true, avatarUrl: true, phone: true, isActive: true },
        });

        return reply.send({ messages, partner, totalCount, hasMore: parseInt(offset) + messages.length < totalCount });
    });

    // ─── Mark Message as Read ───────────────────────────────────
    app.put('/:id/read', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;

        const msg = await prisma.directMessage.findFirst({
            where: { id, receiverId: userId },
        });

        if (!msg) {
            return reply.status(404).send({ error: 'Message not found' });
        }

        await prisma.directMessage.update({
            where: { id },
            data: { isRead: true },
        });

        return reply.send({ success: true });
    });
}
