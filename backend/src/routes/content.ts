import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { requireRole } from '../middleware/rbac.js';
import { createTranslationHook } from '../middleware/translate.js';
import { generateLesson, generateQuizzes, suggestTopics } from '../services/contentGenerator.js';

const lessonSchema = z.object({
    title: z.string().min(3),
    description: z.string(),
    content: z.string(),
    icon: z.string().optional(),
    difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
    category: z.string(),
    isActive: z.boolean().default(false),
});

const schemeSchema = z.object({
    name: z.string().min(3),
    description: z.string(),
    eligibility: z.string(),
    benefits: z.string(),
    link: z.string().optional(),
    isActive: z.boolean().default(false),
});

export async function contentRoutes(app: FastifyInstance) {
    // Public Access (or Auth Only) ──────────────────────────────
    // Anyone authenticated can view content
    // Translate lesson/scheme text to user's language
    app.addHook('onSend', createTranslationHook({ fields: ['title', 'description', 'content', 'name', 'eligibility', 'benefits'] }));

    app.get('/lessons', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const { category, difficulty } = request.query as any;
        const where: any = { isActive: true };

        if (category) where.category = category;
        if (difficulty) where.difficulty = difficulty;

        const lessons = await prisma.lesson.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return reply.send({ lessons });
    });

    app.get('/schemes', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const schemes = await prisma.scheme.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        return reply.send({ schemes });
    });

    // Increment view count
    app.post('/lessons/:id/view', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        await prisma.lesson.update({
            where: { id },
            data: { views: { increment: 1 } }
        });
        return reply.send({ success: true });
    });

    // ─── END USER: Discover Marketplace Schemes ──────────────────
    app.get('/marketplace/schemes', {
        preHandler: [(app as any).authenticate, requireRole('END_USER')],
    }, async (request: any, reply) => {
        const userId = request.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const schemes = await prisma.scheme.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        // Basic eligibility text matching (since eligibility is a string, we do basic heuristics for MVP)
        const matchedSchemes = schemes.map(s => {
            let isEligible = true;
            let matchReason = 'General scheme';
            const eligibilityText = s.eligibility.toLowerCase();

            if (user?.incomeRange === 'BELOW_10K' && eligibilityText.includes('low income')) {
                matchReason = 'Matches your income profile';
            } else if (user?.incomeRange === 'ABOVE_1L' && eligibilityText.includes('low income')) {
                isEligible = false;
            }

            return {
                id: s.id,
                name: s.name,
                description: s.description,
                eligibility: s.eligibility,
                benefits: s.benefits,
                link: s.link,
                isEligible,
                matchReason
            };
        });

        // Sort: Eligible first
        matchedSchemes.sort((a, b) => (a.isEligible === b.isEligible ? 0 : a.isEligible ? -1 : 1));

        return reply.send({ schemes: matchedSchemes });
    });

    // ─── ADMIN Only: Content Management ────────────────────────

    // Create Lesson
    app.post('/lessons', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const data = lessonSchema.parse(request.body);
        const lesson = await prisma.lesson.create({ data });
        return reply.status(201).send({ success: true, lesson });
    });

    // Update Lesson
    app.put('/lessons/:id', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const data = lessonSchema.partial().parse(request.body);

        const lesson = await prisma.lesson.update({
            where: { id },
            data
        });
        return reply.send({ success: true, lesson });
    });

    // Delete Lesson
    app.delete('/lessons/:id', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        await prisma.lesson.delete({ where: { id } });
        return reply.send({ success: true });
    });

    // Create Scheme
    app.post('/schemes', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const data = schemeSchema.parse(request.body);
        const scheme = await prisma.scheme.create({ data });
        return reply.status(201).send({ success: true, scheme });
    });

    // Update Scheme
    app.put('/schemes/:id', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const data = schemeSchema.partial().parse(request.body);

        const scheme = await prisma.scheme.update({
            where: { id },
            data
        });
        return reply.send({ success: true, scheme });
    });

    // Delete Scheme
    app.delete('/schemes/:id', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        await prisma.scheme.delete({ where: { id } });
        return reply.send({ success: true });
    });

    // ─── AI Content Generation ───────────────────────────────────

    // Generate a lesson using AI
    app.post('/generate', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { topic, difficulty, userContext } = z.object({
            topic: z.string().min(3),
            difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
            userContext: z.object({
                incomeRange: z.string().optional(),
                riskProfile: z.string().optional(),
            }).optional(),
        }).parse(request.body);

        try {
            // Log generation attempt
            const genRecord = await prisma.contentGeneration.create({
                data: {
                    topic,
                    difficulty,
                    status: 'DRAFT',
                    generatedById: request.user.userId,
                },
            });

            const generated = await generateLesson(topic, difficulty, userContext);

            // Create a draft lesson
            const lesson = await prisma.lesson.create({
                data: {
                    title: generated.title,
                    description: generated.description,
                    content: generated.content,
                    category: generated.category,
                    difficulty,
                    icon: '📚',
                    isActive: false, // Draft mode
                },
            });

            // Auto-generate quizzes
            const quizzes = await generateQuizzes(generated.content, generated.title, 3);

            // Save quizzes
            const savedQuizzes = await Promise.all(
                quizzes.map(q =>
                    prisma.quiz.create({
                        data: {
                            lessonId: lesson.id,
                            question: q.question,
                            options: q.options,
                            correctIndex: q.correctIndex,
                            explanation: q.explanation,
                        },
                    })
                )
            );

            // Update generation record
            await prisma.contentGeneration.update({
                where: { id: genRecord.id },
                data: {
                    status: 'DRAFT',
                    generatedContent: generated.content,
                    generatedTitle: generated.title,
                    publishedLessonId: lesson.id,
                },
            });

            return reply.status(201).send({
                success: true,
                lesson,
                quizzes: savedQuizzes,
                estimatedDuration: generated.estimatedDuration,
            });
        } catch (error: any) {
            console.error('[ContentGenerate] Error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to generate content: ' + error.message,
            });
        }
    });

    // Publish a generated lesson (admin review → publish)
    app.post('/generate/publish/:id', {
        preHandler: [(app as any).authenticate, requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const lesson = await prisma.lesson.update({
            where: { id },
            data: { isActive: true },
        });

        // Update content generation record
        await prisma.contentGeneration.updateMany({
            where: { publishedLessonId: id },
            data: { status: 'PUBLISHED' },
        });

        return reply.send({ success: true, lesson });
    });

    // Suggest topics based on user profile
    app.get('/suggestions', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const userId = request.user.userId;
        try {
            const suggestions = await suggestTopics(userId);
            return reply.send({ suggestions });
        } catch (error: any) {
            console.error('[ContentSuggestions] Error:', error);
            return reply.send({
                suggestions: [
                    { topic: 'Building an Emergency Fund', reason: 'Essential for financial safety', difficulty: 'BEGINNER', category: 'Savings' },
                    { topic: 'Understanding UPI Payments', reason: 'Master digital payments', difficulty: 'BEGINNER', category: 'Digital Payments' },
                    { topic: 'How SIP Works', reason: 'Start investing small', difficulty: 'BEGINNER', category: 'Investment' },
                ],
            });
        }
    });

    // ─── Quiz Endpoints ──────────────────────────────────────────

    // Get quizzes for a lesson
    app.get('/lessons/:id/quizzes', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const quizzes = await prisma.quiz.findMany({
            where: { lessonId: id },
            select: {
                id: true,
                question: true,
                options: true,
                // Don't send correctIndex — client submits answers
            },
        });

        return reply.send({ quizzes });
    });

    // Submit quiz attempt
    app.post('/quizzes/:id/attempt', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;
        const { selectedIndex } = z.object({
            selectedIndex: z.number().min(0).max(3),
        }).parse(request.body);

        const quiz = await prisma.quiz.findUnique({ where: { id } });
        if (!quiz) return reply.status(404).send({ error: 'Quiz not found' });

        const isCorrect = selectedIndex === quiz.correctIndex;
        const pointsEarned = isCorrect ? 10 : 0;

        // Save attempt
        const attempt = await prisma.quizAttempt.create({
            data: {
                userId,
                quizId: id,
                selectedIndex,
                isCorrect,
            },
        });

        // Award gamification points
        if (isCorrect) {
            await prisma.user.update({
                where: { id: userId },
                data: { points: { increment: pointsEarned } },
            });
        }

        return reply.send({
            success: true,
            isCorrect,
            correctIndex: quiz.correctIndex,
            explanation: quiz.explanation,
            pointsEarned,
        });
    });

    // ─── Progress Tracking ───────────────────────────────────────

    // Mark lesson as completed
    app.post('/lessons/:id/complete', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;

        // Check if already completed
        const existing = await prisma.lessonProgress.findUnique({
            where: { userId_lessonId: { userId, lessonId: id } },
        });

        if (existing?.completedAt) {
            return reply.send({ success: true, alreadyCompleted: true, progress: existing });
        }

        // Get quiz score for this lesson
        const quizzes = await prisma.quiz.findMany({ where: { lessonId: id } });
        const attempts = await prisma.quizAttempt.findMany({
            where: { userId, quizId: { in: quizzes.map(q => q.id) } },
        });
        const quizScore = quizzes.length > 0
            ? Math.round((attempts.filter(a => a.isCorrect).length / quizzes.length) * 100)
            : 100;

        // Upsert progress
        const progress = await prisma.lessonProgress.upsert({
            where: { userId_lessonId: { userId, lessonId: id } },
            update: {
                completedAt: new Date(),
            },
            create: {
                userId,
                lessonId: id,
                completedAt: new Date(),
            },
        });

        // Award points
        await prisma.user.update({
            where: { id: userId },
            data: { points: { increment: 15 } },
        });

        // Increment lesson views
        await prisma.lesson.update({
            where: { id },
            data: { views: { increment: 1 } },
        });

        return reply.send({
            success: true,
            progress,
            pointsEarned: 15,
        });
    });

    // Get user's learning progress
    app.get('/progress', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const userId = request.user.userId;

        const [progress, totalLessons, user] = await Promise.all([
            prisma.lessonProgress.findMany({
                where: { userId },
                include: {
                    lesson: {
                        select: { id: true, title: true, category: true, difficulty: true, icon: true },
                    },
                },
                orderBy: { completedAt: 'desc' },
            }),
            prisma.lesson.count({ where: { isActive: true } }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { points: true, streakDays: true },
            }),
        ]);

        const completed = progress.filter(p => p.completedAt);

        // Calculate quiz score from attempts
        let avgScore = 0;
        if (completed.length > 0) {
            const allQuizzes = await prisma.quiz.findMany({
                where: { lessonId: { in: completed.map(p => p.lessonId) } },
            });
            const allAttempts = await prisma.quizAttempt.findMany({
                where: { userId, quizId: { in: allQuizzes.map(q => q.id) } },
            });
            const totalQuizzes = allQuizzes.length;
            const correctAttempts = allAttempts.filter(a => a.isCorrect).length;
            avgScore = totalQuizzes > 0 ? Math.round((correctAttempts / totalQuizzes) * 100) : 0;
        }

        // Category breakdown
        const categoryProgress: Record<string, { total: number; completed: number }> = {};
        const allLessons = await prisma.lesson.findMany({
            where: { isActive: true },
            select: { id: true, category: true },
        });

        for (const lesson of allLessons) {
            if (!categoryProgress[lesson.category]) {
                categoryProgress[lesson.category] = { total: 0, completed: 0 };
            }
            categoryProgress[lesson.category].total++;
        }
        for (const p of completed) {
            const cat = p.lesson.category;
            if (categoryProgress[cat]) {
                categoryProgress[cat].completed++;
            }
        }

        return reply.send({
            totalLessons,
            completedLessons: completed.length,
            completionPercentage: totalLessons > 0 ? Math.round((completed.length / totalLessons) * 100) : 0,
            averageQuizScore: avgScore,
            points: user?.points || 0,
            streakDays: user?.streakDays || 0,
            categoryProgress,
            recentProgress: progress.slice(0, 10),
        });
    });

    // Leaderboard
    app.get('/leaderboard', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const topUsers = await prisma.user.findMany({
            where: { role: 'END_USER' },
            orderBy: { points: 'desc' },
            take: 20,
            select: {
                id: true,
                name: true,
                points: true,
                streakDays: true,
                _count: {
                    select: { lessonProgress: true },
                },
            },
        });

        const userId = request.user.userId;
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { points: true, streakDays: true },
        });

        // Calculate user's rank
        const userRank = await prisma.user.count({
            where: {
                role: 'END_USER',
                points: { gt: currentUser?.points || 0 },
            },
        });

        return reply.send({
            leaderboard: topUsers.map((u, i) => ({
                rank: i + 1,
                name: u.name,
                points: u.points,
                streakDays: u.streakDays,
                lessonsCompleted: u._count.lessonProgress,
                isCurrentUser: u.id === userId,
            })),
            currentUserRank: userRank + 1,
            currentUserPoints: currentUser?.points || 0,
        });
    });
}
