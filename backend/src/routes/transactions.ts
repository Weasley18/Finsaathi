import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { categorizeTransaction, suggestCategory, CATEGORIES } from '../services/categorizer';

const createTransactionSchema = z.object({
    amount: z.number().positive(),
    type: z.enum(['INCOME', 'EXPENSE']),
    category: z.string().optional(), // Now optional — AI will auto-categorize
    merchant: z.string().optional(),
    description: z.string().optional(),
    source: z.enum(['MANUAL', 'SMS', 'UPI', 'OCR']).default('MANUAL'),
    date: z.string().optional(),
});

const querySchema = z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    category: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export async function transactionRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── AI Auto-Categorize Preview ──────────────────────────────
    // Lets the frontend show a suggested category before the user saves
    app.post('/categorize', async (request: any, reply) => {
        const { description, merchant } = z.object({
            description: z.string().optional(),
            merchant: z.string().optional(),
        }).parse(request.body);

        const suggestion = suggestCategory(description || '', merchant);

        return reply.send({
            suggestedCategory: suggestion.category,
            confidence: suggestion.confidence,
            allMatches: suggestion.allMatches,
            availableCategories: CATEGORIES,
        });
    });

    // ─── Create Transaction ──────────────────────────────────────
    app.post('/', async (request: any, reply) => {
        const data = createTransactionSchema.parse(request.body);
        const userId = request.user.userId;

        // ─── AI Auto-Categorization ──────────────────────────────
        let finalCategory = data.category || 'Other';
        let categorizedBy = 'user';

        if (!data.category || data.category === 'Other' || data.category === '') {
            // No category provided — let AI categorize it
            finalCategory = categorizeTransaction(data.description || '', data.merchant);
            categorizedBy = 'ai';
            console.log(`[Categorizer] Auto-categorized "${data.description || data.merchant}" → ${finalCategory}`);
        }

        const transaction = await prisma.transaction.create({
            data: {
                ...data,
                category: finalCategory,
                userId,
                date: data.date ? new Date(data.date) : new Date(),
            },
        });

        // Update budget spent if expense
        if (data.type === 'EXPENSE') {
            await prisma.budget.updateMany({
                where: { userId, category: finalCategory },
                data: { spent: { increment: data.amount } },
            });
        }

        return reply.status(201).send({
            success: true,
            transaction,
            categorizedBy,
            suggestedCategory: categorizedBy === 'ai' ? finalCategory : undefined,
        });
    });

    // ─── List Transactions ───────────────────────────────────────
    app.get('/', async (request: any, reply) => {
        const { page, limit, type, category, startDate, endDate } = querySchema.parse(request.query);
        const userId = request.user.userId;

        const where: any = { userId };
        if (type) where.type = type;
        if (category) where.category = category;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.transaction.count({ where }),
        ]);

        return reply.send({
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    });

    // ─── Get Transaction by ID ──────────────────────────────────
    app.get('/:id', async (request: any, reply) => {
        const { id } = request.params;

        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: request.user.userId },
        });

        if (!transaction) return reply.status(404).send({ error: 'Transaction not found' });
        return reply.send({ transaction });
    });

    // ─── Delete Transaction ─────────────────────────────────────
    app.delete('/:id', async (request: any, reply) => {
        const { id } = request.params;

        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: request.user.userId },
        });

        if (!transaction) return reply.status(404).send({ error: 'Transaction not found' });

        await prisma.transaction.delete({ where: { id } });

        // Reverse budget update if expense
        if (transaction.type === 'EXPENSE') {
            await prisma.budget.updateMany({
                where: { userId: request.user.userId, category: transaction.category },
                data: { spent: { decrement: transaction.amount } },
            });
        }

        return reply.send({ success: true });
    });

    // ─── Spending by Category ───────────────────────────────────
    app.get('/analytics/by-category', async (request: any, reply) => {
        const userId = request.user.userId;
        const { startDate, endDate } = querySchema.parse(request.query);

        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : now;

        const categorySpending = await prisma.transaction.groupBy({
            by: ['category'],
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: start, lte: end },
            },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
        });

        const total = categorySpending.reduce((sum, c) => sum + (c._sum.amount || 0), 0);

        return reply.send({
            categories: categorySpending.map(c => ({
                category: c.category,
                amount: c._sum.amount || 0,
                count: c._count,
                percentage: total > 0 ? ((c._sum.amount || 0) / total * 100).toFixed(1) : 0,
            })),
            total,
        });
    });

    // ─── Monthly Trend ──────────────────────────────────────────
    app.get('/analytics/monthly-trend', async (request: any, reply) => {
        const userId = request.user.userId;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: sixMonthsAgo } },
            select: { amount: true, type: true, date: true },
            orderBy: { date: 'asc' },
        });

        // Group by month
        const monthlyData: Record<string, { income: number; expense: number }> = {};
        transactions.forEach(t => {
            const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
            if (t.type === 'INCOME') monthlyData[key].income += t.amount;
            else monthlyData[key].expense += t.amount;
        });

        return reply.send({
            months: Object.entries(monthlyData).map(([month, data]) => ({
                month,
                ...data,
                savings: data.income - data.expense,
            })),
        });
    });
}
