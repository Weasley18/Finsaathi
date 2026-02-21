import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { z } from 'zod';
import { requireRole } from '../middleware/rbac.js';
import { createTranslationHook } from '../middleware/translate.js';

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
}
