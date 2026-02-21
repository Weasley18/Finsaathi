import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { requireApproval } from '../middleware/rbac';

const createRoomSchema = z.object({
    type: z.enum(['AI_CHAT', 'ADVISOR_CLONE', 'COPILOT']),
});

const renameRoomSchema = z.object({
    title: z.string().min(1).max(100),
});

export async function chatroomRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Create Chat Room ───────────────────────────────────────
    app.post('/', async (request: any, reply) => {
        const { type } = createRoomSchema.parse(request.body);
        const userId = request.user.userId;

        const room = await prisma.chatRoom.create({
            data: { userId, type, title: 'New Chat' },
        });

        return reply.send({ room });
    });

    // ─── List Chat Rooms ────────────────────────────────────────
    app.get('/', async (request: any, reply) => {
        const userId = request.user.userId;
        const { type } = request.query as { type?: string };

        const where: any = { userId };
        if (type) where.type = type;

        const rooms = await prisma.chatRoom.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { content: true, role: true, createdAt: true },
                },
                _count: { select: { messages: true } },
            },
        });

        const formatted = rooms.map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            messageCount: r._count.messages,
            lastMessage: r.messages[0] || null,
        }));

        return reply.send({ rooms: formatted });
    });

    // ─── Get Single Room ────────────────────────────────────────
    app.get('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;

        const room = await prisma.chatRoom.findFirst({
            where: { id, userId },
        });

        if (!room) return reply.status(404).send({ error: 'Room not found' });

        return reply.send({ room });
    });

    // ─── Rename Room ────────────────────────────────────────────
    app.put('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const { title } = renameRoomSchema.parse(request.body);
        const userId = request.user.userId;

        const room = await prisma.chatRoom.findFirst({ where: { id, userId } });
        if (!room) return reply.status(404).send({ error: 'Room not found' });

        const updated = await prisma.chatRoom.update({
            where: { id },
            data: { title },
        });

        return reply.send({ room: updated });
    });

    // ─── Delete Room ────────────────────────────────────────────
    app.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;

        const room = await prisma.chatRoom.findFirst({ where: { id, userId } });
        if (!room) return reply.status(404).send({ error: 'Room not found' });

        // Messages cascade-delete via Prisma relation onDelete
        await prisma.chatRoom.delete({ where: { id } });

        return reply.send({ success: true });
    });
}
