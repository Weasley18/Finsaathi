import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { categorizeTransaction, suggestCategory, CATEGORIES } from '../services/categorizer.js';
import { chatWithOllama } from '../services/ollama.js';
import { parseBankSMS, batchParseSMS, nlpParseSMS } from '../services/smsParser.js';

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

    // ─── AI Voice/Text Parsing ───────────────────────────────────
    // Takes natural language (e.g. from Voice output) and extracts transaction data
    app.post('/parse-text', async (request: any, reply) => {
        const { text } = z.object({ text: z.string() }).parse(request.body);

        const systemPrompt = `
You are an AI assistant that extracts transaction details from natural language.
The user will provide a sentence like "I spent 200 rupees on groceries yesterday" or "Got my salary of 50000".
Extract the following fields and return ONLY a valid JSON object. Do not include any markdown formatting, just the raw JSON.
{
  "amount": <number>,
  "category": <string> (guess a short category like "Food", "Transport", "Salary", or "Other"),
  "description": <string> (a brief summary of the expense/income),
  "type": <"INCOME" | "EXPENSE">
}
If you cannot determine a field, make your best guess or omit it. But "amount" and "type" are usually mandatory.
        `;

        try {
            const llmResponse = await chatWithOllama(systemPrompt, [{ role: 'user', content: text }]);

            // Try to parse the LLM's JSON
            // Sometimes models wrap json in markdown block, so let's strip it
            const cleanJson = llmResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanJson);

            return reply.send({ success: true, parsedData });
        } catch (e) {
            console.error("Failed to parse text transaction", e);
            // Fallback empty response
            return reply.send({ success: false, parsedData: { amount: 0, category: 'Other', description: text, type: 'EXPENSE' } });
        }
    });

    // ─── SMS Parsing (Enhanced) ─────────────────────────────────
    // Uses dedicated smsParser with 15+ Indian bank templates + NLP fallback
    app.post('/parse-sms', async (request: any, reply) => {
        const { text } = z.object({ text: z.string() }).parse(request.body);

        const parsed = parseBankSMS(text);

        if (parsed) {
            return reply.send({
                success: true,
                transaction: {
                    amount: parsed.amount,
                    type: parsed.type,
                    merchant: parsed.merchant,
                    category: parsed.category,
                    description: parsed.description,
                    source: parsed.source,
                    account: parsed.accountHint,
                    balance: parsed.balance,
                    confidence: parsed.confidence,
                    date: parsed.date,
                },
                method: 'regex',
            });
        }

        // NLP fallback for unrecognized formats
        try {
            const nlpResults = await nlpParseSMS([text]);
            if (nlpResults.length > 0) {
                const r = nlpResults[0];
                return reply.send({
                    success: true,
                    transaction: {
                        amount: r.amount,
                        type: r.type,
                        merchant: r.merchant,
                        category: r.category,
                        description: r.description,
                        source: 'SMS',
                        account: r.accountHint || 'Unknown',
                        balance: r.balance,
                        confidence: r.confidence,
                        date: r.date,
                    },
                    method: 'NLP',
                });
            }
        } catch (e) {
            console.error('[SMS] NLP fallback failed:', e);
        }

        return reply.status(400).send({ success: false, error: 'Could not parse SMS format' });
    });

    // ─── Batch SMS Parsing ──────────────────────────────────────
    app.post('/parse-sms/batch', async (request: any, reply) => {
        const { messages } = z.object({
            messages: z.array(z.string()).min(1).max(100),
        }).parse(request.body);

        const { parsed, failed, stats } = batchParseSMS(messages);

        // Try NLP on failed messages
        let nlpParsed: typeof parsed = [];
        if (failed.length > 0) {
            try {
                nlpParsed = await nlpParseSMS(failed);
            } catch (e) {
                console.error('[SMS] Batch NLP fallback failed:', e);
            }
        }

        return reply.send({
            success: true,
            parsed: [...parsed, ...nlpParsed],
            failedCount: failed.length - nlpParsed.length,
            stats: {
                ...stats,
                nlpRecovered: nlpParsed.length,
                totalSuccess: parsed.length + nlpParsed.length,
            },
        });
    });

    // ─── Import SMS as Transactions ─────────────────────────────
    app.post('/import-sms', async (request: any, reply) => {
        const userId = request.user.userId;
        const { messages } = z.object({
            messages: z.array(z.string()).min(1).max(200),
        }).parse(request.body);

        const { parsed, failed, stats } = batchParseSMS(messages);

        // Try NLP on failed
        let nlpParsed: typeof parsed = [];
        if (failed.length > 0) {
            try {
                nlpParsed = await nlpParseSMS(failed);
            } catch (e) { /* ignore NLP failures */ }
        }

        const allParsed = [...parsed, ...nlpParsed];

        // Deduplicate by amount + date + merchant (avoid double imports)
        const existing = await prisma.transaction.findMany({
            where: { userId, source: { in: ['SMS' as const, 'UPI' as const] } },
            select: { amount: true, date: true, merchant: true },
        });

        const existingSet = new Set(
            existing.map(t => `${t.amount}-${t.date.toISOString().substring(0, 10)}-${t.merchant}`)
        );

        const newTransactions = allParsed.filter(p => {
            const key = `${p.amount}-${p.date.toISOString().substring(0, 10)}-${p.merchant}`;
            return !existingSet.has(key);
        });

        // Create transactions in bulk
        // Map TRANSFER → EXPENSE since Prisma enum only has INCOME/EXPENSE
        const created = await prisma.transaction.createMany({
            data: newTransactions.map(t => ({
                userId,
                amount: t.amount,
                type: (t.type === 'TRANSFER' ? 'EXPENSE' : t.type) as 'INCOME' | 'EXPENSE',
                category: t.category,
                merchant: t.merchant,
                description: t.description.substring(0, 200),
                source: t.source as 'SMS' | 'UPI' | 'MANUAL' | 'OCR',
                date: t.date,
            })),
        });

        // Update budgets for expenses
        const expenses = newTransactions.filter(t => t.type === 'EXPENSE');
        const categoryTotals: Record<string, number> = {};
        expenses.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        for (const [category, total] of Object.entries(categoryTotals)) {
            await prisma.budget.updateMany({
                where: { userId, category },
                data: { spent: { increment: total } },
            });
        }

        return reply.send({
            success: true,
            imported: created.count,
            duplicatesSkipped: allParsed.length - newTransactions.length,
            parseFailures: messages.length - allParsed.length,
            stats: {
                total: messages.length,
                parsed: allParsed.length,
                imported: created.count,
                avgConfidence: stats.avgConfidence,
            },
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
        const { clientId } = request.query as any;
        const userId = (request.user.role === 'ADVISOR' && clientId) ? clientId : request.user.userId;
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
