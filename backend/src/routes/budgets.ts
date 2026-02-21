import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { z } from 'zod';

const budgetSchema = z.object({
    category: z.string(),
    limit: z.number().positive(),
    period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).default('MONTHLY'),
});

export async function budgetRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Create / Update Budget ──────────────────────────────────
    app.post('/', async (request: any, reply) => {
        const data = budgetSchema.parse(request.body);
        const userId = request.user.userId;

        const budget = await prisma.budget.upsert({
            where: {
                userId_category_period: {
                    userId,
                    category: data.category,
                    period: data.period,
                },
            },
            update: { limit: data.limit },
            create: { ...data, userId },
        });

        return reply.send({ success: true, budget });
    });

    // ─── List Budgets ────────────────────────────────────────────
    app.get('/', async (request: any, reply) => {
        const userId = request.user.userId;

        const budgets = await prisma.budget.findMany({
            where: { userId },
            orderBy: { category: 'asc' },
        });

        // Calculate current month spending per category
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const spending = await prisma.transaction.groupBy({
            by: ['category'],
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: startOfMonth },
            },
            _sum: { amount: true },
        });

        const spendingMap = new Map(spending.map(s => [s.category, s._sum.amount || 0]));

        const budgetsWithStatus = budgets.map(b => ({
            ...b,
            spent: spendingMap.get(b.category) || 0,
            remaining: b.limit - (spendingMap.get(b.category) || 0),
            percentage: ((spendingMap.get(b.category) || 0) / b.limit * 100).toFixed(1),
            isOverBudget: (spendingMap.get(b.category) || 0) > b.limit,
        }));

        return reply.send({ budgets: budgetsWithStatus });
    });

    // ─── Delete Budget ───────────────────────────────────────────
    app.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const budget = await prisma.budget.findFirst({
            where: { id, userId: request.user.userId },
        });

        if (!budget) return reply.status(404).send({ error: 'Budget not found' });

        await prisma.budget.delete({ where: { id } });
        return reply.send({ success: true });
    });

    // ─── Budget Overview ─────────────────────────────────────────
    app.get('/overview', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalBudget, totalSpent] = await Promise.all([
            prisma.budget.aggregate({
                where: { userId, period: 'MONTHLY' },
                _sum: { limit: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
        ]);

        const budgetTotal = totalBudget._sum.limit || 0;
        const spentTotal = totalSpent._sum.amount || 0;

        return reply.send({
            totalBudget: budgetTotal,
            totalSpent: spentTotal,
            remaining: budgetTotal - spentTotal,
            percentage: budgetTotal > 0 ? ((spentTotal / budgetTotal) * 100).toFixed(1) : 0,
            daysRemaining: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(),
        });
    });
}
