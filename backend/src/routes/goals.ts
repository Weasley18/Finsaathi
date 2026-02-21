import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { z } from 'zod';

const goalSchema = z.object({
    name: z.string(),
    icon: z.string().optional(),
    targetAmount: z.number().positive(),
    currentAmount: z.number().default(0),
    targetDate: z.string().optional(),
});

const updateGoalSchema = z.object({
    name: z.string().optional(),
    icon: z.string().optional(),
    targetAmount: z.number().positive().optional(),
    currentAmount: z.number().optional(),
    targetDate: z.string().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED']).optional(),
});

export async function goalRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Create Goal ─────────────────────────────────────────────
    app.post('/', async (request: any, reply) => {
        const data = goalSchema.parse(request.body);
        const userId = request.user.userId;

        const goal = await prisma.goal.create({
            data: {
                ...data,
                userId,
                targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
            },
        });

        return reply.status(201).send({ success: true, goal });
    });

    // ─── List Goals ──────────────────────────────────────────────
    app.get('/', async (request: any, reply) => {
        const userId = request.user.userId;
        const status = (request.query as any).status;

        const goals = await prisma.goal.findMany({
            where: {
                userId,
                ...(status && { status }),
            },
            orderBy: { updatedAt: 'desc' },
        });

        const goalsWithProgress = goals.map(g => ({
            ...g,
            progress: g.targetAmount > 0
                ? parseFloat(((g.currentAmount / g.targetAmount) * 100).toFixed(1))
                : 0,
            remaining: g.targetAmount - g.currentAmount,
            daysUntilTarget: g.targetDate
                ? Math.ceil((g.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null,
            monthlySavingsNeeded: g.targetDate
                ? ((g.targetAmount - g.currentAmount) /
                    Math.max(1, Math.ceil((g.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))))
                    .toFixed(0)
                : null,
        }));

        // Summary
        const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
        const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

        return reply.send({
            goals: goalsWithProgress,
            summary: {
                totalGoals: goals.length,
                activeGoals: goals.filter(g => g.status === 'ACTIVE').length,
                completedGoals: goals.filter(g => g.status === 'COMPLETED').length,
                totalTarget,
                totalSaved,
                overallProgress: totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0,
            },
        });
    });

    // ─── Update Goal ─────────────────────────────────────────────
    app.put('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const data = updateGoalSchema.parse(request.body);

        const goal = await prisma.goal.findFirst({
            where: { id, userId: request.user.userId },
        });

        if (!goal) return reply.status(404).send({ error: 'Goal not found' });

        const updated = await prisma.goal.update({
            where: { id },
            data: {
                ...data,
                targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
                // Auto-complete if amount reached
                ...(data.currentAmount && data.currentAmount >= (data.targetAmount || goal.targetAmount)
                    ? { status: 'COMPLETED' }
                    : {}),
            },
        });

        return reply.send({ success: true, goal: updated });
    });

    // ─── Add to Goal ─────────────────────────────────────────────
    app.post('/:id/contribute', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const { amount } = z.object({ amount: z.number().positive() }).parse(request.body);

        const goal = await prisma.goal.findFirst({
            where: { id, userId: request.user.userId, status: 'ACTIVE' },
        });

        if (!goal) return reply.status(404).send({ error: 'Active goal not found' });

        const newAmount = goal.currentAmount + amount;
        const completed = newAmount >= goal.targetAmount;

        const updated = await prisma.goal.update({
            where: { id },
            data: {
                currentAmount: newAmount,
                ...(completed ? { status: 'COMPLETED' } : {}),
            },
        });

        return reply.send({
            success: true,
            goal: updated,
            completed,
            message: completed
                ? `🎉 Congratulations! You've reached your "${goal.name}" goal!`
                : `Added ₹${amount}. ${((newAmount / goal.targetAmount) * 100).toFixed(0)}% complete!`,
        });
    });

    // ─── Delete Goal ─────────────────────────────────────────────
    app.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const goal = await prisma.goal.findFirst({
            where: { id, userId: request.user.userId },
        });

        if (!goal) return reply.status(404).send({ error: 'Goal not found' });

        await prisma.goal.delete({ where: { id } });
        return reply.send({ success: true });
    });
}
