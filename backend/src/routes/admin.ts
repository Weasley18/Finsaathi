import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';

const rejectSchema = z.object({
    reason: z.string().min(1),
});

export async function adminRoutes(app: FastifyInstance) {
    // Middleware to ensure user is an ADMIN
    app.addHook('preHandler', async (request: any, reply) => {
        try {
            await request.jwtVerify();
            if (request.user.role !== 'ADMIN') {
                return reply.status(403).send({ error: 'Forbidden: Admin access only' });
            }
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // ─── Get Pending Approvals ───────────────────────────────────
    app.get('/pending-approvals', async (request, reply) => {
        const users = await prisma.user.findMany({
            where: {
                approvalStatus: 'PENDING',
                role: { in: ['ADVISOR', 'PARTNER'] },
            },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
                businessId: true,
            },
        });

        // Fetch their uploaded documents (identity proofs, certifications)
        const userDocs = await prisma.document.findMany({
            where: {
                userId: { in: users.map(u => u.id) },
            },
        });

        const usersWithDocs = users.map(user => ({
            ...user,
            documents: userDocs.filter(d => d.userId === user.id),
        }));

        return reply.send({ users: usersWithDocs });
    });

    // ─── Approve User ────────────────────────────────────────────
    app.post('/approve/:userId', async (request: any, reply) => {
        const { userId } = request.params;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { approvalStatus: 'APPROVED' },
        });

        // In production: Send confirmation SMS/Email here

        return reply.send({ success: true, user });
    });

    // ─── Reject User ─────────────────────────────────────────────
    app.post('/reject/:userId', async (request: any, reply) => {
        const { userId } = request.params;
        const { reason } = rejectSchema.parse(request.body);

        const user = await prisma.user.update({
            where: { id: userId },
            data: { approvalStatus: 'REJECTED' },
        });

        // In production: Send rejection reason SMS/Email here
        console.log(`User ${userId} rejected. Reason: ${reason}`);

        return reply.send({ success: true, user });
    });
}
