import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { logAudit } from '../services/audit.js';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { sendOtpSms, isSmsConfigured } from '../services/sms.js';

const MAX_OTP_ATTEMPTS = 5;

// OTPs are never stored in plaintext — only an HMAC keyed with the server secret.
function hashOtp(phone: string, code: string): string {
    return createHmac('sha256', process.env.JWT_SECRET as string).update(`${phone}:${code}`).digest('hex');
}

// Dev convenience: when no SMS gateway is configured and we are not in production
// (or EXPOSE_DEV_OTP=true is set explicitly), the OTP is returned in the response
// so the apps can be demoed without reading server logs.
function shouldExposeDevOtp(): boolean {
    if (isSmsConfigured()) return false;
    return process.env.NODE_ENV !== 'production' || process.env.EXPOSE_DEV_OTP === 'true';
}

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
    incomeRange: z.enum(['BELOW_10K', 'FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'FROM_1L_TO_2_5L', 'FROM_2_5L_TO_5L', 'FROM_5L_TO_10L', 'ABOVE_1L', 'ABOVE_10L']).optional(),
    riskProfile: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
    areasOfInterest: z.array(z.string()).optional(), // JSON parsed externally
    role: z.enum(['END_USER', 'ADVISOR', 'PARTNER']).optional(),
    businessId: z.string().optional(),

    // Partner specific fields
    legalDocType: z.string().optional(),
    legalDocNumber: z.string().optional(),
    registeredAddr: z.string().optional(),
    regulatoryRegNumber: z.string().optional(),
    complianceOfficerEmail: z.string().optional(),
    complianceOfficerPhone: z.string().optional(),
    technicalContactEmail: z.string().optional(),
    technicalContactPhone: z.string().optional(),
    digitalAcceptanceOfTerms: z.boolean().optional(),
    hasSignedDataProcessAgreement: z.boolean().optional(),
    hasSignedNoPIIAccess: z.boolean().optional(),
    hasSignedNoDataResale: z.boolean().optional(),
    hasSignedBreachReport: z.boolean().optional(),
    webhookUrl: z.string().optional(),
    oauthCompatible: z.boolean().optional(),

    // Advisor Profile Fields
    businessAddress: z.string().optional(),
    professionalEmail: z.string().email().optional(),
    sebiCertificateIssueDate: z.string().optional(), // ISO String
    sebiCertificateExpiryDate: z.string().optional(), // ISO String
    baslMembershipId: z.string().optional(),
    highestQualification: z.string().optional(),
    optionalCertifications: z.array(z.string()).optional(),
    languagesSpoken: z.array(z.string()).optional(),
    areasOfExpertise: z.array(z.string()).optional(),
    feeModel: z.enum(['NGO_SUBSIDIZED', 'CSR_FUNDED', 'FLAT_FEE', 'B2B_SPONSORED']).optional()
});

export async function authRoutes(app: FastifyInstance) {
    // ─── Send OTP ────────────────────────────────────────────────
    app.post('/send-otp', async (request, reply) => {
        const { phone } = sendOtpSchema.parse(request.body);

        // Per-phone rate limiting: max 3 OTP requests per 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentOtpCount = await prisma.otpCode.count({
            where: { phone, createdAt: { gte: tenMinutesAgo } },
        });

        if (recentOtpCount >= 3) {
            return reply.status(429).send({
                error: 'Too many OTP requests. Please wait 10 minutes before requesting again.',
            });
        }

        // Invalidate all previous unused OTPs for this phone
        await prisma.otpCode.updateMany({
            where: { phone, used: false },
            data: { used: true },
        });

        // Generate 6-digit OTP using crypto for better randomness
        const code = randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

        await prisma.otpCode.create({
            data: { phone, code: hashOtp(phone, code), expiresAt },
        });

        // Send OTP via SMS (falls back to console log in dev if MSG91 not configured)
        try {
            await sendOtpSms(phone, code);
        } catch (err) {
            app.log.error(err, '[Auth] SMS delivery failed');
            return reply.status(500).send({ error: 'Failed to send OTP. Please try again.' });
        }

        // In production the OTP only ever arrives via SMS.
        return reply.send({
            success: true,
            message: 'OTP sent successfully',
            ...(shouldExposeDevOtp() && { otp: code }),
        });
    });

    // ─── Verify OTP ──────────────────────────────────────────────
    app.post('/verify-otp', async (request, reply) => {
        const { phone, code } = verifyOtpSchema.parse(request.body);

        // Latest live OTP for this phone (previous ones are invalidated on send)
        const otpRecord = await prisma.otpCode.findFirst({
            where: { phone, used: false, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
            return reply.status(400).send({ error: 'Invalid or expired OTP' });
        }

        // Brute-force protection: burn the OTP after too many wrong guesses
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
            return reply.status(429).send({ error: 'Too many incorrect attempts. Please request a new OTP.' });
        }

        const expected = Buffer.from(otpRecord.code, 'utf8');
        const actual = Buffer.from(hashOtp(phone, code), 'utf8');
        const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

        if (!matches) {
            const updated = await prisma.otpCode.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } },
            });
            if (updated.attempts >= MAX_OTP_ATTEMPTS) {
                await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
                return reply.status(429).send({ error: 'Too many incorrect attempts. Please request a new OTP.' });
            }
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

        // Generate JWT — includes tier so requireTier() can avoid a DB lookup
        const token = app.jwt.sign(
            { userId: user.id, phone: user.phone, role: user.role, approvalStatus: user.approvalStatus, language: user.language || 'en', tier: user.tier || null },
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
        const {
            role, businessId, areasOfInterest,
            businessAddress, professionalEmail,
            sebiCertificateIssueDate, sebiCertificateExpiryDate,
            baslMembershipId, highestQualification,
            optionalCertifications, languagesSpoken, areasOfExpertise, feeModel,
            ...data
        } = profileSchema.parse(request.body);
        const userId = request.user.userId;

        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            return reply.status(404).send({ error: 'User not found' });
        }

        // A role can only be chosen once, while the account is still a plain END_USER.
        // Advisors/partners cannot switch roles here, and approvalStatus is ONLY ever
        // touched when an account first applies for an elevated role (-> PENDING).
        // Approval, rejection, suspension and tier changes are admin-only actions.
        if (role && role !== existing.role && existing.role !== 'END_USER') {
            return reply.status(403).send({ error: 'Role cannot be changed after registration. Contact support.' });
        }
        const isApplyingForElevatedRole =
            existing.role === 'END_USER' && existing.approvalStatus === 'APPROVED' &&
            (role === 'ADVISOR' || role === 'PARTNER');

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                ...(isApplyingForElevatedRole && { role, approvalStatus: 'PENDING' as const }),
                // New advisors always start on the FREE tier; PREMIUM is granted by an admin.
                ...(isApplyingForElevatedRole && role === 'ADVISOR' && { tier: 'FREE' as const }),
                ...(businessId && { businessId }),
                ...(areasOfInterest && { areasOfInterest }),
            },
        });

        if (isApplyingForElevatedRole) {
            await logAudit(request, 'ROLE_APPLICATION', 'user', userId, { role });
        }

        // Create AdvisorProfile if the role is ADVISOR
        if (user.role === 'ADVISOR' && businessAddress && professionalEmail && baslMembershipId && highestQualification && feeModel && sebiCertificateIssueDate && sebiCertificateExpiryDate) {
            await prisma.advisorProfile.upsert({
                where: { userId },
                update: {},
                create: {
                    userId,
                    businessAddress,
                    professionalEmail,
                    sebiCertificateIssueDate: new Date(sebiCertificateIssueDate),
                    sebiCertificateExpiryDate: new Date(sebiCertificateExpiryDate),
                    baslMembershipId,
                    highestQualification,
                    feeModel,
                    optionalCertifications: optionalCertifications || [],
                    languagesSpoken: languagesSpoken || [],
                    areasOfExpertise: areasOfExpertise || [],
                }
            })
        }

        // Create initial financial profile
        await prisma.financialProfile.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                healthScore: 50, // Starting score
            },
        });

        // Generate new JWT since role/approvalStatus/language/tier may have changed
        const token = app.jwt.sign(
            { userId: user.id, phone: user.phone, role: user.role, approvalStatus: user.approvalStatus, language: user.language || 'en', tier: user.tier || null },
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