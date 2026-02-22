import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';

const rejectSchema = z.object({
    reason: z.string().min(1),
});

function getRelativeTime(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

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

    // ─── Platform Stats ──────────────────────────────────────────
    app.get('/stats', async (request, reply) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [
            totalUsers, totalAdvisors, totalPartners, totalAdmins,
            pendingApprovals, transactionCount, activeToday,
            avgHealth, userGrowth, recentActivity
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'END_USER' } }),
            prisma.user.count({ where: { role: 'ADVISOR' } }),
            prisma.user.count({ where: { role: 'PARTNER' } }),
            prisma.user.count({ where: { role: 'ADMIN' } }),
            prisma.user.count({ where: { approvalStatus: 'PENDING', role: { in: ['ADVISOR', 'PARTNER'] } } }),
            prisma.transaction.count({ where: { date: { gte: startOfMonth } } }),
            prisma.user.count({ where: { updatedAt: { gte: todayStart } } }),
            prisma.financialProfile.aggregate({ _avg: { healthScore: true } }),
            // User growth by month (last 6 months)
            prisma.$queryRaw`
                SELECT 
                    TO_CHAR("createdAt", 'Mon') as month,
                    COUNT(*)::int as users
                FROM "users" 
                WHERE "createdAt" >= NOW() - INTERVAL '6 months'
                GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
                ORDER BY DATE_TRUNC('month', "createdAt") ASC
            ` as Promise<Array<{month: string, users: number}>>,
            // Recent activity (latest user actions)
            prisma.notification.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, title: true, message: true, createdAt: true, type: true },
            }),
        ]);

        const totalAllUsers = totalUsers + totalAdvisors + totalPartners + totalAdmins;

        return reply.send({
            stats: {
                totalUsers: totalAllUsers,
                endUsers: totalUsers,
                totalAdvisors,
                totalPartners,
                totalAdmins,
                pendingApprovals,
                activeToday,
                transactions: transactionCount,
                avgHealth: avgHealth._avg.healthScore != null ? Math.round(avgHealth._avg.healthScore) : null,
            },
            userGrowth: (userGrowth as any[]) || [],
            roleDistribution: [
                { name: 'End Users', value: totalUsers, color: 'var(--accent)' },
                { name: 'Advisors', value: totalAdvisors, color: 'var(--success)' },
                { name: 'Partners', value: totalPartners, color: 'var(--info)' },
                { name: 'Admins', value: totalAdmins, color: 'var(--error)' },
            ],
            recentActivity: recentActivity.map(a => ({
                text: a.title || a.message,
                time: getRelativeTime(a.createdAt),
                type: a.type === 'ALERT' ? 'warning' : a.type === 'SUCCESS' ? 'success' : 'info',
            })),
        });
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
            select: {
                id: true,
                userId: true,
                type: true,
                fileName: true,
                status: true,
                reviewNote: true,
                uploadedAt: true,
            },
            orderBy: { uploadedAt: 'desc' },
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
