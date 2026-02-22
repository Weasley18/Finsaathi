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

    // ─── User-Facing Content Generation ─────────────────────────

    // End users can request a lesson to be generated on a topic
    // If a lesson already exists on the topic, return it; otherwise generate in simple terms
    app.post('/learn/generate', {
        preHandler: [(app as any).authenticate],
    }, async (request: any, reply) => {
        const { topic, difficulty } = z.object({
            topic: z.string().min(3),
            difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
        }).parse(request.body);

        const userId = request.user.userId;

        // Check if a lesson already exists on this topic (fuzzy match by title)
        const existing = await prisma.lesson.findFirst({
            where: {
                OR: [
                    { title: { contains: topic, mode: 'insensitive' as any } },
                    { title: { equals: topic, mode: 'insensitive' as any } },
                ],
                isActive: true,
            },
            include: {
                quizzes: {
                    select: { id: true, question: true, options: true },
                },
            },
        });

        if (existing) {
            // Track view
            await prisma.lesson.update({ where: { id: existing.id }, data: { views: { increment: 1 } } });
            return reply.send({ success: true, lesson: existing, quizzes: existing.quizzes, fromCache: true });
        }

        try {
            // Fetch user context for personalized content
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { incomeRange: true, riskProfile: true },
            });

            const generated = await generateLesson(topic, difficulty, {
                incomeRange: user?.incomeRange || undefined,
                riskProfile: user?.riskProfile || undefined,
            });

            // Save as active lesson
            const lesson = await prisma.lesson.create({
                data: {
                    title: generated.title,
                    description: generated.description,
                    content: generated.content,
                    category: generated.category,
                    difficulty,
                    icon: '📚',
                    isActive: true,
                },
            });

            // Generate quizzes
            const quizData = await generateQuizzes(generated.content, generated.title, 4);
            const savedQuizzes = await Promise.all(
                quizData.map(q =>
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

            // Track view
            await prisma.lesson.update({ where: { id: lesson.id }, data: { views: { increment: 1 } } });

            return reply.status(201).send({
                success: true,
                lesson,
                quizzes: savedQuizzes.map(q => ({ id: q.id, question: q.question, options: q.options })),
                fromCache: false,
            });
        } catch (error: any) {
            console.error('[LearnGenerate] Error:', error);
            // Return fallback content so the page doesn't break
            const fallbackContent = generateFallbackLesson(topic);
            const lesson = await prisma.lesson.create({
                data: {
                    title: fallbackContent.title,
                    description: fallbackContent.description,
                    content: fallbackContent.content,
                    category: fallbackContent.category,
                    difficulty,
                    icon: '📚',
                    isActive: true,
                },
            });

            const fallbackQuizzes = generateFallbackQuizzes(topic);
            const savedQuizzes = await Promise.all(
                fallbackQuizzes.map(q =>
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

            return reply.status(201).send({
                success: true,
                lesson,
                quizzes: savedQuizzes.map(q => ({ id: q.id, question: q.question, options: q.options })),
                fromCache: false,
                fallback: true,
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

// ─── Fallback Content (when Ollama is unavailable) ────────────

const FALLBACK_LESSONS: Record<string, { title: string; description: string; content: string; category: string }> = {
    'What is Inflation?': {
        title: 'What is Inflation?',
        description: 'Understanding how prices increase over time and how it affects your savings.',
        category: 'Basics',
        content: `## What is Inflation? 🎈

Inflation means **prices of things go up over time**. Think of it like this:

### A Simple Example
- In 2020, a plate of chole bhature cost ₹50
- In 2025, the same plate costs ₹80
- The chole bhature didn't change — but money became **less powerful**

### Why Should You Care?
If you keep ₹1,00,000 in a box at home:
- **Today** it buys 1,250 plates of chole bhature (₹80 each)
- **After 5 years** at 6% inflation, the same chole bhature might cost ₹107
- Your ₹1,00,000 now only buys **935 plates** 😮

**Your money lost value without you spending a single rupee!**

### How to Beat Inflation
1. **Don't keep all money in cash** — it loses value sitting idle
2. **Use a savings account** — at least earn 3-4% interest
3. **Try Fixed Deposits** — earn 6-7% (about matching inflation)
4. **Consider SIPs in mutual funds** — can earn 10-12% over long term

### Real Numbers for India
- India's average inflation: **~6% per year**
- Savings bank interest: **~3-4% per year**
- FD interest: **~6-7% per year**
- Mutual fund returns (long term): **~10-12% per year**

### 💡 Key Takeaway
**If your money isn't growing faster than inflation (6%), you're actually losing money!** Start by moving idle cash to at least a savings account or FD. Even small steps help beat inflation.`,
    },
    'How Does EMI Work?': {
        title: 'How Does EMI Work?',
        description: 'Learn how Equated Monthly Installments break down your loan payments.',
        category: 'Loans',
        content: `## How Does EMI Work? 💳

EMI stands for **Equated Monthly Installment** — it's how you repay loans in easy, equal monthly parts.

### Think of it Like This
Imagine you buy a phone worth ₹20,000 on EMI for 12 months:
- You pay roughly **₹1,850/month** for 12 months
- Total paid: ₹22,200 (the extra ₹2,200 is **interest** — the bank's fee for lending you money)

### What's Inside Your EMI?
Every EMI has two parts:
1. **Principal** — paying back the actual loan amount
2. **Interest** — the bank's charge for lending

**Early EMIs** → More interest, less principal
**Later EMIs** → More principal, less interest

### A Real Example: Home Loan
- **Loan amount**: ₹30,00,000 (₹30 lakh)
- **Interest rate**: 8.5% per year
- **Tenure**: 20 years (240 months)
- **Monthly EMI**: ₹26,035

**Total you'll pay**: ₹62,48,400
**Interest alone**: ₹32,48,400 (more than the loan itself! 😮)

### Smart Tips to Save on EMIs
1. **Make a bigger down payment** — borrow less, pay less interest
2. **Choose shorter tenure** — higher EMI but much less total interest
3. **Prepay when possible** — even ₹5,000 extra occasionally saves lakhs
4. **Compare rates** — even 0.5% less interest saves a lot over 20 years

### 💡 Key Takeaway
**EMI makes big purchases possible, but always calculate the total cost (principal + interest).** A "low EMI" with a long tenure means you pay much more in total. Keep EMIs under 40% of your monthly income.`,
    },
    'Understanding CIBIL Score': {
        title: 'Understanding CIBIL Score',
        description: 'Your credit score impacts your ability to get loans. Learn how it works.',
        category: 'Credit',
        content: `## Understanding CIBIL Score 📊

Your CIBIL score is like your **report card for money** — it tells banks if they can trust you with a loan.

### What is it?
- A **3-digit number** between 300 and 900
- Higher is better ✅
- Banks check this before giving you any loan or credit card

### Score Ranges
| Score | Rating | What it means |
|-------|--------|---------------|
| 750-900 | Excellent ⭐ | Easy loan approval, best interest rates |
| 700-749 | Good 👍 | Most loans approved |
| 650-699 | Fair 🤔 | May get loans but at higher interest |
| Below 650 | Poor ❌ | Loan rejected or very high interest |

### What Affects Your Score?
1. **Payment history (35%)** — Did you pay EMIs/bills on time?
2. **Credit utilization (30%)** — How much of your credit limit do you use?
3. **Credit age (15%)** — How old are your credit accounts?
4. **Credit mix (10%)** — Do you have different types of credit?
5. **New credit (10%)** — How many new loans did you apply for recently?

### Simple Ways to Improve Your Score
- ✅ **Always pay credit card bills on time** (even minimum due)
- ✅ **Keep credit card usage below 30%** of your limit
- ✅ **Don't apply for too many loans** at once
- ✅ **Keep old credit cards active** (they show long credit history)
- ❌ **Never skip an EMI** — even one missed payment hurts badly

### A Real Example
Rahul has a credit card with ₹1,00,000 limit:
- **Good**: He uses ₹25,000 and pays full bill every month → Score goes UP
- **Bad**: He uses ₹90,000 and pays only minimum due → Score goes DOWN

### 💡 Key Takeaway
**Your CIBIL score can save or cost you lakhs in interest.** Check your free CIBIL score yearly at cibil.com. Aim for 750+ for the best loan deals.`,
    },
    'SIP vs Lump Sum Investment': {
        title: 'SIP vs Lump Sum Investment',
        description: 'Which investment strategy works better for you?',
        category: 'Investment',
        content: `## SIP vs Lump Sum Investment 📈

Two ways to invest money — let's understand which one suits you better!

### What is SIP?
**Systematic Investment Plan** — You invest a **fixed small amount every month**
- Like a recurring deposit, but in mutual funds
- Example: ₹2,000 every month

### What is Lump Sum?
You invest a **big amount all at once**
- Example: Investing ₹2,40,000 in one go

### The Chai Stall Example ☕
Imagine you buy tea leaves every month:
- **Month 1**: ₹200/kg → you buy 1 kg
- **Month 2**: ₹250/kg → you buy 0.8 kg
- **Month 3**: ₹180/kg → you buy 1.1 kg
- **Average cost**: ₹210/kg (less than ₹250!)

This is called **Rupee Cost Averaging** — SIP does this automatically!

### Side by Side Comparison
| Feature | SIP | Lump Sum |
|---------|-----|----------|
| Amount needed | Small (₹500/month) | Large (₹50,000+) |
| Risk | Lower (averaged out) | Higher (depends on timing) |
| Best when market is | Volatile/falling | Clearly rising |
| Discipline required | Auto-debit helps | Need self-control |
| Best for | Salaried people | Bonus/windfall money |

### Real Numbers
Investing ₹5,000/month in SIP for 10 years at 12% average return:
- **Total invested**: ₹6,00,000
- **Value after 10 years**: ~₹11,61,695
- **Profit**: ₹5,61,695 💰

### Which Should You Choose?
- **Choose SIP if**: You earn a monthly salary, are new to investing, or markets are volatile
- **Choose Lump Sum if**: You got a bonus, tax refund, or are confident about market timing
- **Best approach**: Use **both**! SIP for regular investing + Lump Sum when you have extra money

### 💡 Key Takeaway
**Start with SIP — even ₹500/month works!** Don't wait for the "right time" to invest. Time IN the market beats timing THE market.`,
    },
    'The 50/30/20 Budget Rule': {
        title: 'The 50/30/20 Budget Rule',
        description: 'A simple budgeting framework that works for every income level.',
        category: 'Budgeting',
        content: `## The 50/30/20 Budget Rule 📒

The simplest way to manage your money — just split your income into 3 parts!

### The Rule
- **50% → Needs** (things you MUST pay for)
- **30% → Wants** (things you ENJOY but can live without)
- **20% → Savings & Debt** (building your future)

### Example: Monthly Income ₹30,000

**50% = ₹15,000 for NEEDS:**
- Rent: ₹8,000
- Groceries: ₹4,000
- Transport: ₹2,000
- Phone/Internet: ₹1,000

**30% = ₹9,000 for WANTS:**
- Eating out/Zomato: ₹3,000
- Shopping/Entertainment: ₹3,000
- Subscriptions (Netflix, etc): ₹500
- Personal care: ₹2,500

**20% = ₹6,000 for SAVINGS:**
- Emergency fund: ₹2,000
- SIP in mutual fund: ₹2,000
- PPF/FD: ₹2,000

### Is 50/30/20 Too Strict?
Not at all! Adjust it to your situation:
- **Earning less?** Try 60/20/20 or 70/20/10
- **Living with parents?** Try 30/30/40 (save more!)
- **Have loans?** Try 50/20/30 (pay off debt faster)

### Common Mistakes
❌ Counting EMIs as "needs" for things like new phone (that's a want!)
❌ Not tracking small expenses (₹50 chai × 30 days = ₹1,500/month!)
❌ Skipping savings because "there's nothing left"

### How to Start Today
1. **Write down your monthly income** (after tax)
2. **List all your expenses** from last month
3. **Categorize each** as Need, Want, or Savings
4. **Adjust** to get closer to 50/30/20
5. **Set up auto-transfers** for savings on salary day

### 💡 Key Takeaway
**Pay yourself first!** On salary day, immediately transfer 20% to savings. Whatever's left is what you can spend. The best budget is one you actually follow — even 10% savings is better than 0%.`,
    },
    'Emergency Fund 101': {
        title: 'Emergency Fund 101',
        description: 'Why you need 3-6 months of expenses saved and how to build it.',
        category: 'Savings',
        content: `## Emergency Fund 101 🏦

An emergency fund is money you keep aside **only for unexpected problems** — like a safety net for your life.

### Why Do You Need One?
Life is unpredictable. Here are real emergencies:
- 🏥 Family member gets sick (hospital bill: ₹50,000+)
- 💼 You lose your job (no salary for 2-3 months)
- 🔧 Bike/scooter breaks down (repair: ₹10,000)
- 🏠 Landlord asks you to vacate suddenly (deposit + shifting: ₹30,000)

**Without an emergency fund** → You borrow at 24-36% interest (credit card/personal loan)
**With an emergency fund** → You handle it calmly, no debt!

### How Much Do You Need?
**Simple formula**: Monthly expenses × 3 to 6 months

| Monthly Expenses | 3-Month Fund | 6-Month Fund |
|-----------------|-------------|-------------|
| ₹15,000 | ₹45,000 | ₹90,000 |
| ₹25,000 | ₹75,000 | ₹1,50,000 |
| ₹40,000 | ₹1,20,000 | ₹2,40,000 |

### Where to Keep It?
Your emergency fund should be:
- ✅ **Easy to withdraw** (liquid)
- ✅ **Safe** (no market risk)
- ❌ **NOT in stocks/mutual funds** (value can drop when you need it)

**Best options:**
1. **Savings account** — instant access, 3-4% interest
2. **Liquid mutual fund** — 1-day withdrawal, 4-6% returns
3. **FD with premature withdrawal** — 6-7% returns
4. **Sweep-in FD** — best of both (FD returns + savings account access)

### How to Build It (Step by Step)
1. **Start with ₹1,000/month** — even this is a great start
2. **Automate it** — set up auto-transfer on salary day
3. **First target ₹10,000** → then ₹25,000 → then 1 month expenses
4. **Use windfalls** — put bonus, gifts, tax refund into emergency fund
5. **Don't touch it** for non-emergencies! (No, a new phone is not an emergency 😄)

### 💡 Key Takeaway
**Start today, even if it's ₹500.** Building an emergency fund is the #1 financial priority before investing or spending on wants. It buys you peace of mind.`,
    },
    'Tax Saving Under Section 80C': {
        title: 'Tax Saving Under Section 80C',
        description: 'Save up to ₹1.5 lakh on taxes with these investment options.',
        category: 'Tax',
        content: `## Tax Saving Under Section 80C 🧾

Section 80C lets you **reduce your taxable income by up to ₹1,50,000** — meaning you pay less tax!

### How Does It Work?
If your annual income is ₹8,00,000 and you invest ₹1,50,000 under 80C:
- **Taxable income becomes**: ₹6,50,000
- **Tax saved**: Up to ₹31,200 (in old tax regime, 20% slab) 🎉

### Best 80C Investment Options (Ranked)

**1. ELSS Mutual Funds** ⭐ (Best for most people)
- Lock-in: Only 3 years (shortest!)
- Returns: 10-15% average
- Start with: ₹500/month SIP
- Best for: Young earners who can handle some risk

**2. PPF (Public Provident Fund)** 🔒
- Lock-in: 15 years
- Returns: 7.1% (guaranteed, tax-free)
- Minimum: ₹500/year
- Best for: Safe, long-term savings

**3. EPF (Employee Provident Fund)** 💼
- Already deducted from salary
- Returns: 8.25%
- Best part: Employer also contributes!

**4. NPS (National Pension System)**
- Extra ₹50,000 deduction under 80CCD(1B)!
- Returns: 8-10%
- Lock-in: Until age 60

**5. Tax-Saving FD** 🏦
- Lock-in: 5 years
- Returns: 6-7%
- Best for: Zero risk tolerance

### Common Things Already Counted Under 80C
- ✅ Your EPF contribution (auto-deducted from salary)
- ✅ Life insurance premium
- ✅ Children's tuition fees (up to 2 children)
- ✅ Home loan principal repayment

### Smart Strategy for Beginners
1. Check how much EPF is already covering from your salary slip
2. Remaining limit → Put in ELSS SIP (₹5,000-₹10,000/month)
3. Don't wait until March! Start SIP in April itself

### 💡 Key Takeaway
**Don't waste your ₹1.5 lakh 80C limit!** Even if you do nothing else, start an ELSS SIP of ₹12,500/month. You'll save tax AND build wealth. Remember: 80C works on OLD tax regime only.`,
    },
    'UPI Fraud Prevention': {
        title: 'UPI Fraud Prevention',
        description: 'Protect yourself from common UPI scams and frauds.',
        category: 'Security',
        content: `## UPI Fraud Prevention 🛡️

UPI is super convenient, but scammers are getting smarter. Here's how to stay safe!

### Most Common UPI Scams

**1. The "Collect Request" Scam** 🚨
- Scammer sends you a COLLECT request (not payment!)
- They say: "I'm sending you ₹5,000, please approve"
- You approve → ₹5,000 is TAKEN from your account!
- **Rule: You NEVER need to approve anything to RECEIVE money**

**2. The Fake Customer Care Scam** 📞
- You search "Paytm customer care" on Google
- You find a fake number, call it
- They ask for UPI PIN or OTP
- **Rule: No company ever asks for your UPI PIN**

**3. The QR Code Scam** 📱
- Someone says "scan this QR to receive money"
- Scanning QR is for PAYING, not receiving!
- **Rule: You never scan QR to receive money**

**4. The Screen Share Scam** 🖥️
- Scammer asks you to install AnyDesk/TeamViewer
- They can see your screen and steal your PIN
- **Rule: Never install screen-sharing apps for strangers**

### Golden Rules of UPI Safety
1. 🔒 **Never share UPI PIN with anyone** — not even bank employees
2. ❌ **You don't need to enter PIN to RECEIVE money** — ever!
3. 🔍 **Always check if it's PAY or COLLECT** before approving
4. 📵 **Don't click links from unknown numbers** on WhatsApp/SMS
5. 🚫 **Never scan unknown QR codes** — especially for "receiving" money
6. 📱 **Use official apps only** — download from Play Store/App Store
7. 🔑 **Set strong UPI PIN** — don't use birthdate or 1234

### What to Do if You're Scammed
1. **Immediately** call your bank's helpline
2. **Report on NPCI** — npci.org.in/what-we-do/upi/dispute-redressal
3. **File complaint** — cybercrime.gov.in or call 1930
4. **Block your UPI** through your bank app
5. **File FIR** at nearest police station

### 💡 Key Takeaway
**Remember this one rule and you'll never be scammed: You NEVER need to enter your UPI PIN or approve a request to RECEIVE money.** If anyone asks you to do this, it's 100% a scam.`,
    },
};

function generateFallbackLesson(topic: string) {
    const fallback = FALLBACK_LESSONS[topic];
    if (fallback) return fallback;

    return {
        title: topic,
        description: `Learn about ${topic} in simple, easy terms`,
        category: 'Basics',
        content: `## ${topic}\n\nThis lesson is about **${topic}**. Here are the key points you should know:\n\n### Why is this important?\nUnderstanding ${topic} helps you make better financial decisions and manage your money wisely.\n\n### Key Points\n- Start by learning the basics\n- Apply small changes in your daily life\n- Track your progress over time\n\n### 💡 Key Takeaway\nEvery financial journey starts with a single step. Learning about ${topic} is a great first step toward financial wellness!`,
    };
}

function generateFallbackQuizzes(topic: string) {
    const quizMap: Record<string, Array<{ question: string; options: string[]; correctIndex: number; explanation: string }>> = {
        'What is Inflation?': [
            { question: 'What does inflation mean in simple terms?', options: ['Prices go up over time', 'You get a salary raise', 'Banks give more interest', 'Government prints less money'], correctIndex: 0, explanation: 'Inflation means the general price level of goods and services rises over time, reducing purchasing power.' },
            { question: 'If inflation is 6% per year, what happens to ₹1,00,000 kept at home for one year?', options: ['It becomes ₹1,06,000', 'It stays ₹1,00,000 but buys less', 'It becomes ₹94,000', 'Nothing happens to cash'], correctIndex: 1, explanation: 'The cash amount stays the same, but it can buy about 6% fewer things — so its real value drops.' },
            { question: 'Which investment typically beats inflation in India?', options: ['Keeping cash at home', 'Savings account (3-4%)', 'Mutual fund SIP (10-12%)', 'All of these'], correctIndex: 2, explanation: 'With India\'s average inflation around 6%, mutual fund SIPs averaging 10-12% returns are among the best inflation-beating options.' },
            { question: 'What is the rough average inflation rate in India?', options: ['2%', '6%', '12%', '20%'], correctIndex: 1, explanation: 'India\'s average inflation rate hovers around 5-7%, commonly cited as approximately 6%.' },
        ],
        'How Does EMI Work?': [
            { question: 'What does EMI stand for?', options: ['Equated Monthly Installment', 'Easy Money Investment', 'Electronic Money Interface', 'Equal Monthly Interest'], correctIndex: 0, explanation: 'EMI stands for Equated Monthly Installment — a fixed monthly payment to repay a loan.' },
            { question: 'What are the two parts of every EMI?', options: ['Tax and Fee', 'Principal and Interest', 'Down payment and Balance', 'Savings and Spending'], correctIndex: 1, explanation: 'Each EMI consists of Principal (actual loan repayment) and Interest (bank\'s charge for lending).' },
            { question: 'What happens in the early months of a loan?', options: ['You pay more principal', 'You pay more interest', 'EMI amount increases', 'Bank gives a discount'], correctIndex: 1, explanation: 'In early EMIs, a larger portion goes to interest. As you progress, more goes toward principal.' },
            { question: 'What is a smart way to reduce total interest on a loan?', options: ['Take a longer tenure', 'Make prepayments when possible', 'Pay only minimum EMI', 'Take another loan'], correctIndex: 1, explanation: 'Making extra prepayments reduces the outstanding principal, which directly reduces total interest paid.' },
        ],
    };

    return quizMap[topic] || [
        { question: `What is the most important thing about ${topic}?`, options: ['Understanding the basics', 'Ignoring it completely', 'Spending more money', 'Avoiding all financial decisions'], correctIndex: 0, explanation: `Understanding the basics of ${topic} is the first step to making better financial decisions.` },
        { question: `Why should you learn about ${topic}?`, options: ['It helps you waste money', 'It improves your financial health', 'It is not important', 'Only rich people need to know'], correctIndex: 1, explanation: `Learning about ${topic} helps everyone make better financial decisions regardless of income level.` },
        { question: `What should you do after learning about ${topic}?`, options: ['Forget everything', 'Apply it in small steps daily', 'Only think about it once a year', 'Tell no one'], correctIndex: 1, explanation: 'The best way to benefit from financial knowledge is to apply it gradually in your daily life.' },
    ];
}
