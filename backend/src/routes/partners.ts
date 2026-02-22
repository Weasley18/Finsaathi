import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { requireRole, requireApproval } from '../middleware/rbac';

export async function partnerRoutes(app: FastifyInstance) {
    app.addHook('preHandler', (app as any).authenticate);

    // ─── Partner Dashboard ───────────────────────────────────────
    app.get('/dashboard', {
        preHandler: [requireRole('PARTNER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const partnerId = request.user.userId;

        const [products, totalMatches, totalApplied, totalOnboarded] = await Promise.all([
            prisma.partnerProduct.count({ where: { partnerId } }),
            prisma.partnerMatch.count({
                where: { product: { partnerId }, status: 'MATCHED' },
            }),
            prisma.partnerMatch.count({
                where: { product: { partnerId }, status: 'APPLIED' },
            }),
            prisma.partnerMatch.count({
                where: { product: { partnerId }, status: 'ONBOARDED' },
            }),
        ]);

        const totalMatchedUsers = totalMatches + totalApplied + totalOnboarded;
        const conversionRate = totalMatchedUsers > 0
            ? ((totalOnboarded / totalMatchedUsers) * 100).toFixed(1)
            : '0.0';

        // Recent matches
        const recentMatches = await prisma.partnerMatch.findMany({
            where: { product: { partnerId } },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                product: { select: { name: true, type: true } },
            },
        });

        return reply.send({
            stats: {
                totalProducts: products,
                matchedUsers: totalMatches,
                applications: totalApplied,
                onboarded: totalOnboarded,
                conversionRate: conversionRate + '%',
            },
            recentMatches: recentMatches.map((m: any) => ({
                id: m.id,
                productName: m.product.name,
                productType: m.product.type,
                status: m.status,
                matchedAt: m.createdAt,
            })),
        });
    });

    // ─── Analytics (k-anonymized) ────────────────────────────────
    app.get('/analytics', {
        preHandler: [requireRole('PARTNER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        // Aggregate income distribution of all users (k-anonymized, k≥50)
        const incomeDistribution = await prisma.user.groupBy({
            by: ['incomeRange'],
            where: { role: 'END_USER', incomeRange: { not: null } },
            _count: true,
        });

        // Only return groups with ≥ 50 users (K-Anonymity)
        const kAnonymizedIncome = incomeDistribution
            .filter((g: any) => g._count >= 50)
            .map((g: any) => ({
                incomeRange: g.incomeRange || 'Unknown',
                userCount: g._count,
            }));

        // Risk profile distribution
        const riskDistribution = await prisma.user.groupBy({
            by: ['riskProfile'],
            where: { role: 'END_USER', riskProfile: { not: null } },
            _count: true,
        });

        // K-Anonymity for Risk Profile (K>=50)
        const kAnonymizedRisk = riskDistribution
            .filter((r: any) => r._count >= 50)
            .map((r: any) => ({
                riskProfile: r.riskProfile || 'Unknown',
                userCount: r._count,
            }));

        // Product uptake funnel for this partner
        const partnerId = request.user.userId;
        const funnel = await Promise.all([
            prisma.partnerMatch.count({ where: { product: { partnerId }, status: 'MATCHED' } }),
            prisma.partnerMatch.count({ where: { product: { partnerId }, status: 'APPLIED' } }),
            prisma.partnerMatch.count({ where: { product: { partnerId }, status: 'ONBOARDED' } }),
        ]);

        return reply.send({
            incomeDistribution: kAnonymizedIncome,
            riskDistribution: kAnonymizedRisk,
            uptakeFunnel: {
                matched: funnel[0],
                applied: funnel[1],
                onboarded: funnel[2],
            },
            privacy: {
                standard: 'K-Anonymity',
                kValue: 50,
                message: 'Data is aggregated and groups with fewer than 50 users are hidden to protect individual privacy.'
            }
        });
    });

    // ─── List Products ───────────────────────────────────────────
    app.get('/products', {
        preHandler: [requireRole('PARTNER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const partnerId = request.user.userId;

        const products = await prisma.partnerProduct.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { matches: true } },
            },
        });

        return reply.send({
            products: products.map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                type: p.type,
                eligibilityCriteria: p.eligibilityCriteria ? JSON.parse(p.eligibilityCriteria) : null,
                interestRate: p.interestRate,
                minAmount: p.minAmount,
                maxAmount: p.maxAmount,
                isActive: p.isActive,
                totalMatches: p._count.matches,
                createdAt: p.createdAt,
            })),
        });
    });

    // ─── Create Product ──────────────────────────────────────────
    app.post('/products', {
        preHandler: [requireRole('PARTNER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const partnerId = request.user.userId;
        const { name, description, type, eligibilityCriteria, interestRate, minAmount, maxAmount } = request.body;

        if (!name || !description || !type) {
            return reply.status(400).send({ error: 'Name, description, and type are required' });
        }

        const product = await prisma.partnerProduct.create({
            data: {
                partnerId,
                name,
                description,
                type,
                eligibilityCriteria: eligibilityCriteria ? JSON.stringify(eligibilityCriteria) : null,
                interestRate: interestRate || null,
                minAmount: minAmount || null,
                maxAmount: maxAmount || null,
            },
        });

        return reply.status(201).send({ product });
    });

    // ─── Update Product ──────────────────────────────────────────
    app.put('/products/:id', {
        preHandler: [requireRole('PARTNER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const partnerId = request.user.userId;
        const updates = request.body;

        const existing = await prisma.partnerProduct.findFirst({
            where: { id, partnerId },
        });
        if (!existing) return reply.status(404).send({ error: 'Product not found' });

        if (updates.eligibilityCriteria && typeof updates.eligibilityCriteria === 'object') {
            updates.eligibilityCriteria = JSON.stringify(updates.eligibilityCriteria);
        }

        const product = await prisma.partnerProduct.update({
            where: { id },
            data: updates,
        });

        return reply.send({ product });
    });

    // ─── Delete Product ──────────────────────────────────────────
    app.delete('/products/:id', {
        preHandler: [requireRole('PARTNER', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const partnerId = request.user.userId;

        const existing = await prisma.partnerProduct.findFirst({
            where: { id, partnerId },
        });
        if (!existing) return reply.status(404).send({ error: 'Product not found' });

        await prisma.partnerProduct.delete({ where: { id } });
        return reply.send({ success: true });
    });

    // ─── END USER: Discover Marketplace ──────────────────────────

    // List eligible products for the current user
    app.get('/marketplace/products', {
        preHandler: [requireRole('END_USER', 'PARTNER', 'ADMIN')],
    }, async (request: any, reply) => {
        const userId = request.user.userId;

        // Fetch user profile to match eligibility
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        // Fetch all active products
        const products = await prisma.partnerProduct.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                partner: { select: { name: true, businessId: true } }
            }
        });

        // Fetch user's existing applications
        const userMatches = await prisma.partnerMatch.findMany({
            where: { userId }
        });
        const appliedProductIds = new Set(userMatches.map((m: any) => m.productId));

        // Basic matching logic (can be expanded)
        const matchedProducts = products.map((p: any) => {
            let isEligible = true;
            let matchReason = 'General offering';

            // Example basic eligibility check based on JSON criteria
            if (p.eligibilityCriteria) {
                try {
                    const criteria = JSON.parse(p.eligibilityCriteria);
                    if (criteria.incomeRange && user?.incomeRange !== criteria.incomeRange) {
                        isEligible = false; // Note: In a real app, this should be a >= check, but exact match for MVP
                    }
                    if (criteria.riskProfile && user?.riskProfile !== criteria.riskProfile) {
                        isEligible = false;
                    }
                } catch (e) {
                    console.error('Error parsing eligibility criteria', e);
                }
            }

            return {
                id: p.id,
                name: p.name,
                description: p.description,
                type: p.type,
                interestRate: p.interestRate,
                minAmount: p.minAmount,
                maxAmount: p.maxAmount,
                partnerName: p.partner?.name || 'Partner',
                isEligible,
                matchReason,
                hasApplied: appliedProductIds.has(p.id)
            };
        });

        // For MVP, return all but flag eligibility, so we can show "Recommended for you" vs "Other products"
        return reply.send({ products: matchedProducts });
    });

    // Apply for a product
    app.post('/apply/:productId', {
        preHandler: [requireRole('END_USER')],
    }, async (request: any, reply) => {
        const { productId } = request.params as { productId: string };
        const userId = request.user.userId;

        const product = await prisma.partnerProduct.findUnique({ where: { id: productId } });
        if (!product) return reply.status(404).send({ error: 'Product not found' });

        const existingMatch = await prisma.partnerMatch.findFirst({
            where: { userId, productId }
        });

        if (existingMatch) {
            return reply.status(400).send({ error: 'Already applied or matched for this product' });
        }

        const match = await prisma.partnerMatch.create({
            data: {
                userId,
                productId,
                status: 'APPLIED'
            }
        });

        return reply.status(201).send({ success: true, match });
    });
}
