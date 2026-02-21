import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { requireRole, requireOwnerOrRole, hasHigherOrEqualRole } from '../middleware/rbac';

const updateUserSchema = z.object({
    name: z.string().optional(),
    language: z.string().optional(),
    incomeRange: z.enum(['BELOW_10K', 'FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L']).optional(),
    riskProfile: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
    avatarUrl: z.string().optional(),
});

const adminUpdateUserSchema = updateUserSchema.extend({
    role: z.enum(['END_USER', 'ADVISOR', 'ADMIN']).optional(),
    isActive: z.boolean().optional(),
});

export async function userRoutes(app: FastifyInstance) {
    // All user routes require auth
    app.addHook('preHandler', app.authenticate as any);

    // ═══════════════════════════════════════════════════════════════
    // END USER routes — own data only
    // ═══════════════════════════════════════════════════════════════

    // ─── Get Own Profile ─────────────────────────────────────────
    app.get('/profile', async (request: any, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: request.user.userId },
            include: {
                financialProfile: true,
                _count: {
                    select: {
                        transactions: true,
                        goals: true,
                        documents: true,
                    },
                },
            },
        });

        if (!user) return reply.status(404).send({ error: 'User not found' });
        return reply.send({ user });
    });

    // ─── Update Own Profile ──────────────────────────────────────
    app.put('/profile', async (request: any, reply) => {
        const data = updateUserSchema.parse(request.body);

        const user = await prisma.user.update({
            where: { id: request.user.userId },
            data,
        });

        // Re-issue JWT if language changed (so chat route picks up new language)
        let token: string | undefined;
        if (data.language) {
            token = app.jwt.sign(
                { userId: user.id, phone: user.phone, role: user.role, approvalStatus: user.approvalStatus, language: user.language || 'en' },
                { expiresIn: '30d' }
            );
        }

        return reply.send({ success: true, user, ...(token && { token }) });
    });

    // ─── Get Dashboard Summary (own data) ────────────────────────
    app.get('/dashboard', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [user, monthlyExpenses, monthlyIncome, goals, recentTransactions, profile] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'INCOME', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.goal.findMany({
                where: { userId, status: 'ACTIVE' },
                orderBy: { updatedAt: 'desc' },
                take: 5,
            }),
            prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 10,
            }),
            prisma.financialProfile.findUnique({ where: { userId } }),
        ]);

        const categorySpending = await prisma.transaction.groupBy({
            by: ['category'],
            where: { userId, type: 'EXPENSE', date: { gte: startOfMonth } },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
        });

        return reply.send({
            user: {
                name: user?.name,
                language: user?.language,
            },
            summary: {
                totalExpenses: monthlyExpenses._sum.amount || 0,
                totalIncome: monthlyIncome._sum.amount || 0,
                savings: (monthlyIncome._sum.amount || 0) - (monthlyExpenses._sum.amount || 0),
                healthScore: profile?.healthScore ?? null,
            },
            goals,
            recentTransactions,
            categorySpending: categorySpending.map(c => ({
                category: c.category,
                amount: c._sum.amount || 0,
            })),
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // ADMIN & ADVISOR routes — manage other users
    // ═══════════════════════════════════════════════════════════════

    // ─── List All Users (Admin / Advisor) ────────────────────────
    app.get('/', {
        preHandler: [requireRole('ADMIN', 'ADVISOR')],
    }, async (request: any, reply) => {
        const { role, search, page = '1', limit = '50' } = request.query as any;

        const where: any = {};
        if (role) where.role = role;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }

        // Advisors can only see END_USERs
        if (request.user.role === 'ADVISOR') {
            where.role = 'END_USER';
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    phone: true,
                    name: true,
                    role: true,
                    language: true,
                    incomeRange: true,
                    riskProfile: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.user.count({ where }),
        ]);

        return reply.send({
            users,
            pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        });
    });

    // ─── Get User by ID (Admin / Advisor) ────────────────────────
    app.get('/:id', {
        preHandler: [requireRole('ADMIN', 'ADVISOR')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                financialProfile: true,
                _count: {
                    select: { transactions: true, goals: true, documents: true },
                },
            },
        });

        if (!user) return reply.status(404).send({ error: 'User not found' });

        // Advisors can only view END_USERs
        if (request.user.role === 'ADVISOR' && user.role !== 'END_USER') {
            return reply.status(403).send({ error: 'Advisors can only view end users' });
        }

        return reply.send({ user });
    });

    // ─── Admin: Update Any User ──────────────────────────────────
    app.put('/:id', {
        preHandler: [requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const data = adminUpdateUserSchema.parse(request.body);

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return reply.status(404).send({ error: 'User not found' });

        // Prevent demoting yourself
        if (id === request.user.userId && data.role && data.role !== targetUser.role) {
            return reply.status(400).send({ error: 'Cannot change your own role' });
        }

        // Prevent disabling yourself
        if (id === request.user.userId && data.isActive === false) {
            return reply.status(400).send({ error: 'Cannot disable your own account' });
        }

        const user = await prisma.user.update({
            where: { id },
            data,
        });

        return reply.send({ success: true, user });
    });

    // ─── Admin: Delete User ──────────────────────────────────────
    app.delete('/:id', {
        preHandler: [requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };

        if (id === request.user.userId) {
            return reply.status(400).send({ error: 'Cannot delete your own account' });
        }

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return reply.status(404).send({ error: 'User not found' });

        // Prevent deleting higher-privilege users
        if (!hasHigherOrEqualRole(request.user.role, targetUser.role)) {
            return reply.status(403).send({ error: 'Cannot delete users with higher privileges' });
        }

        await prisma.user.delete({ where: { id } });
        return reply.send({ success: true, message: `User ${targetUser.phone} deleted` });
    });
}
