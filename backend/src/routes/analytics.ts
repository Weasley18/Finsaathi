import { FastifyInstance } from 'fastify';
import { prisma } from '../server';

export async function analyticsRoutes(app: FastifyInstance) {
    app.addHook('preHandler', (app as any).authenticate);

    // ─── Dashboard Summary ──────────────────────────────────────
    app.get('/dashboard', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [income, expense, goals, budgets, profile, txCount] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId, type: 'INCOME', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.goal.findMany({ where: { userId, status: 'ACTIVE' } }),
            prisma.budget.findMany({ where: { userId } }),
            prisma.financialProfile.findUnique({ where: { userId } }),
            prisma.transaction.count({ where: { userId } }),
        ]);

        const totalIncome = income._sum.amount || 0;
        const totalExpense = expense._sum.amount || 0;

        return reply.send({
            monthlyIncome: totalIncome,
            monthlyExpense: totalExpense,
            monthlySavings: totalIncome - totalExpense,
            savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
            activeGoals: goals.length,
            activeBudgets: budgets.length,
            healthScore: profile?.healthScore || null,
            totalTransactions: txCount,
            budgetUtilization: budgets.map(b => ({
                category: b.category,
                limit: b.limit,
                spent: b.spent,
                percentage: Math.round((b.spent / b.limit) * 100),
                status: b.spent > b.limit ? 'exceeded' : b.spent > b.limit * 0.8 ? 'warning' : 'ok',
            })),
        });
    });

    // ─── Income vs Expense Trend (6 months) ─────────────────────
    app.get('/trend', async (request: any, reply) => {
        const userId = request.user.userId;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: sixMonthsAgo } },
            select: { amount: true, type: true, date: true },
            orderBy: { date: 'asc' },
        });

        const monthlyData: Record<string, { income: number; expense: number }> = {};
        for (const t of transactions) {
            const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
            if (t.type === 'INCOME') monthlyData[key].income += t.amount;
            else monthlyData[key].expense += t.amount;
        }

        return reply.send({
            months: Object.entries(monthlyData).map(([month, data]) => ({
                month,
                income: Math.round(data.income),
                expense: Math.round(data.expense),
                savings: Math.round(data.income - data.expense),
            })),
        });
    });

    // ─── Category Breakdown ─────────────────────────────────────
    app.get('/categories', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const categories = await prisma.transaction.groupBy({
            by: ['category'],
            where: { userId, type: 'EXPENSE', date: { gte: startOfMonth } },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
        });

        const total = categories.reduce((s, c) => s + (c._sum.amount || 0), 0);

        return reply.send({
            categories: categories.map(c => ({
                category: c.category,
                amount: Math.round(c._sum.amount || 0),
                count: c._count,
                percentage: total > 0 ? Math.round(((c._sum.amount || 0) / total) * 100) : 0,
            })),
            totalExpense: Math.round(total),
        });
    });
}
