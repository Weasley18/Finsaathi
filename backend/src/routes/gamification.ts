import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';

const BADGE_RULES = [
    { name: 'First Step', description: 'Logged your first expense', requiredPoints: 10, icon: '🌟' },
    { name: 'Consistent Saver', description: 'Reached a 3-day streak', requiredPoints: 30, icon: '🔥' },
    { name: 'Financial Ninja', description: 'Earned 100 points', requiredPoints: 100, icon: '🥷' }
];

const PointsSchema = z.object({
    action: z.enum(['LOG_EXPENSE', 'CREATE_GOAL', 'READ_LESSON', 'DAILY_LOGIN']),
});

const ACTION_POINTS: Record<string, number> = {
    'LOG_EXPENSE': 10,
    'CREATE_GOAL': 20,
    'READ_LESSON': 15,
    'DAILY_LOGIN': 5
};

export async function gamificationRoutes(app: FastifyInstance) {
    app.addHook('preHandler', (app as any).authenticate);

    // Get current gamification status (Points, Streak, Badges)
    app.get('/status', async (request: any, reply) => {
        const userId = request.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { points: true, streakDays: true, lastActiveAt: true }
        });

        if (!user) return reply.status(404).send({ error: 'User not found' });

        const badges = await prisma.badge.findMany({
            where: { userId },
            orderBy: { awardedAt: 'desc' }
        });

        const recentActivities = await prisma.activityTracker.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return reply.send({
            points: user.points,
            streakDays: user.streakDays,
            lastActiveAt: user.lastActiveAt,
            badges,
            recentActivities
        });
    });

    // Log Activity & Evaluate Rewards (Streak & Badges)
    app.post('/log-activity', async (request: any, reply) => {
        const userId = request.user.userId;
        const { action } = PointsSchema.parse(request.body);

        const pointsToAward = ACTION_POINTS[action] || 0;

        // 1. Fetch current user state
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return reply.status(404).send({ error: 'User not found' });

        const now = new Date();
        let newStreak = user.streakDays;

        // 2. Calculate Streak Logic
        if (user.lastActiveAt) {
            const lastActive = new Date(user.lastActiveAt);
            const diffTime = Math.abs(now.getTime() - lastActive.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Consecutive day
                newStreak += 1;
            } else if (diffDays > 1) {
                // Streak broken
                newStreak = 1;
            }
        } else {
            // First time activity
            newStreak = 1;
        }

        const newPoints = user.points + pointsToAward;

        // 3. Update User & Log Activity Transactionally
        const [updatedUser, newActivity] = await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    points: newPoints,
                    streakDays: newStreak,
                    lastActiveAt: now
                }
            }),
            prisma.activityTracker.create({
                data: {
                    userId,
                    action,
                    points: pointsToAward
                }
            })
        ]);

        // 4. Check & Award Badges
        const earnedBadges = [];
        for (const rule of BADGE_RULES) {
            // Check if user already has the badge
            const existingBadge = await prisma.badge.findFirst({
                where: { userId, name: rule.name }
            });

            if (!existingBadge) {
                // Determine eligibility based on points (simplistic rule engine for MVP)
                if (updatedUser.points >= rule.requiredPoints) {
                    const badge = await prisma.badge.create({
                        data: {
                            userId,
                            name: rule.name,
                            description: rule.description,
                            icon: rule.icon
                        }
                    });
                    earnedBadges.push(badge);
                }
            }
        }

        return reply.send({
            success: true,
            awardedPoints: pointsToAward,
            totalPoints: updatedUser.points,
            currentStreak: updatedUser.streakDays,
            newBadges: earnedBadges
        });
    });
}
