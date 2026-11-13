import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';

const BADGE_RULES = [
    { name: 'First Step', description: 'Logged your first expense', requiredPoints: 10, icon: '🌟' },
    { name: 'Consistent Saver', description: 'Reached a 3-day streak', requiredPoints: 30, icon: '🔥' },
    { name: 'Financial Ninja', description: 'Earned 100 points', requiredPoints: 100, icon: '🥷' },
    { name: 'Quiz Master', description: 'Answered 10 quiz questions correctly', requiredPoints: 150, icon: '🧠' },
    { name: 'Bookworm', description: 'Completed 5 lessons', requiredPoints: 200, icon: '📚' },
    { name: 'Budget Pro', description: 'Stayed within budget for a month', requiredPoints: 250, icon: '💰' },
    { name: 'Goal Crusher', description: 'Completed a savings goal', requiredPoints: 300, icon: '🏆' },
];

const PointsSchema = z.object({
    action: z.enum(['LOG_EXPENSE', 'CREATE_GOAL', 'READ_LESSON', 'DAILY_LOGIN', 'COMPLETE_QUIZ', 'COMPLETE_LESSON', 'EARN_CERTIFICATE', 'SET_BUDGET', 'IMPORT_SMS']),
});

const ACTION_POINTS: Record<string, number> = {
    'LOG_EXPENSE': 10,
    'CREATE_GOAL': 20,
    'READ_LESSON': 15,
    'DAILY_LOGIN': 5,
    'COMPLETE_QUIZ': 10,
    'COMPLETE_LESSON': 20,
    'EARN_CERTIFICATE': 50,
    'SET_BUDGET': 15,
    'IMPORT_SMS': 5,
};

// How many times per calendar day each action can earn points.
// Extra calls are accepted but award nothing, so points cannot be farmed.
const DAILY_CAPS: Record<string, number> = {
    'LOG_EXPENSE': 5,
    'CREATE_GOAL': 2,
    'READ_LESSON': 5,
    'DAILY_LOGIN': 1,
    'COMPLETE_QUIZ': 5,
    'COMPLETE_LESSON': 5,
    'EARN_CERTIFICATE': 1,
    'SET_BUDGET': 2,
    'IMPORT_SMS': 2,
};

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

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

        // 1. Fetch current user state
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return reply.status(404).send({ error: 'User not found' });

        const now = new Date();
        const today = startOfDay(now);

        // Enforce the per-day cap for this action
        const countToday = await prisma.activityTracker.count({
            where: { userId, action, createdAt: { gte: today } },
        });
        const capReached = countToday >= (DAILY_CAPS[action] ?? 1);
        const pointsToAward = capReached ? 0 : (ACTION_POINTS[action] || 0);

        // 2. Streak logic — based on calendar days, so repeated calls on the
        //    same day never extend the streak.
        let newStreak = user.streakDays;
        if (user.lastActiveAt) {
            const dayGap = Math.round(
                (today.getTime() - startOfDay(new Date(user.lastActiveAt)).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (dayGap === 1) newStreak += 1;        // consecutive day
            else if (dayGap > 1) newStreak = 1;      // streak broken
            else if (newStreak === 0) newStreak = 1; // same day, first activity
        } else {
            newStreak = 1;
        }

        if (capReached) {
            await prisma.user.update({ where: { id: userId }, data: { streakDays: newStreak, lastActiveAt: now } });
            return reply.send({
                success: true,
                awardedPoints: 0,
                totalPoints: user.points,
                currentStreak: newStreak,
                newBadges: [],
                message: 'Daily limit reached for this activity',
            });
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
