import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { z } from 'zod';

const sendOtpSchema = z.object({
    phone: z.string().min(10).max(13),
});

const verifyOtpSchema = z.object({
    phone: z.string().min(10).max(13),
    code: z.string().length(6),
});

const profileSchema = z.object({
    name: z.string().min(1),
    language: z.string().default('en'),
    incomeRange: z.enum(['BELOW_10K', 'FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L']).optional(),
    riskProfile: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
    role: z.enum(['END_USER', 'ADVISOR', 'PARTNER']).optional(),
    tier: z.enum(['FREE', 'PREMIUM']).optional(),
    businessId: z.string().optional()
});

export async function authRoutes(app: FastifyInstance) {
    // ─── Send OTP ────────────────────────────────────────────────
    app.post('/send-otp', async (request, reply) => {
        const { phone } = sendOtpSchema.parse(request.body);

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

        // Store OTP
        await prisma.otpCode.create({
            data: { phone, code, expiresAt },
        });

        // In production: send via SMS gateway (Twilio/MSG91)
        // For dev: log it
        console.log(`📱 OTP for ${phone}: ${code}`);

        return reply.send({
            success: true,
            message: 'OTP sent successfully',
            // Include OTP in dev mode for testing
            ...(process.env.NODE_ENV !== 'production' && { otp: code }),
        });
    });

    // ─── Verify OTP ──────────────────────────────────────────────
    app.post('/verify-otp', async (request, reply) => {
        const { phone, code } = verifyOtpSchema.parse(request.body);

        // Find valid OTP
        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                phone,
                code,
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
            return reply.status(400).send({ error: 'Invalid or expired OTP' });
        }

        // Mark OTP as used
        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { used: true },
        });

        // Find or create user
        let user = await prisma.user.findUnique({ where: { phone } });

        if (!user) {
            user = await prisma.user.create({
                data: { phone },
            });
        }

        console.log(`[Auth] Verifying OTP for ${phone}. User found: ${!!user}, Role: ${user?.role}`);

        // Generate JWT (includes language for translation)
        const token = app.jwt.sign(
            { userId: user.id, phone: user.phone, role: user.role, approvalStatus: user.approvalStatus, language: user.language || 'en' },
            { expiresIn: '30d' }
        );

        return reply.send({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                language: user.language,
                role: user.role,
                approvalStatus: user.approvalStatus,
                isNewUser: !user.name,
            },
        });
    });

    // ─── Complete Profile (after first login) ────────────────────
    app.post('/complete-profile', {
        preHandler: [app.authenticate as any],
    }, async (request: any, reply) => {
        const { role, tier, businessId, ...data } = profileSchema.parse(request.body);
        const userId = request.user.userId;

        let approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED' = 'APPROVED';
        if (role === 'ADVISOR' || role === 'PARTNER') {
            approvalStatus = 'PENDING';
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                ...(role && { role }),
                ...(tier && { tier }),
                ...(businessId && { businessId }),
                approvalStatus,
            },
        });

        // Create initial financial profile
        await prisma.financialProfile.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                healthScore: 50, // Starting score
            },
        });

        // Generate new JWT since role/approvalStatus/language changed
        const token = app.jwt.sign(
            { userId: user.id, phone: user.phone, role: user.role, approvalStatus: user.approvalStatus, language: user.language || 'en' },
            { expiresIn: '30d' }
        );

        return reply.send({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                language: user.language,
                incomeRange: user.incomeRange,
                riskProfile: user.riskProfile,
                role: user.role,
                approvalStatus: user.approvalStatus,
            },
        });
    });

    // ─── Get Current User ────────────────────────────────────────
    app.get('/me', {
        preHandler: [app.authenticate as any],
    }, async (request: any, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: request.user.userId },
            include: { financialProfile: true },
        });

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return reply.send({ user });
    });
}
