import 'dotenv/config';
import { randomBytes } from 'crypto';

// ─── JWT secret: never fall back to a known value ────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('REPLACE') || process.env.JWT_SECRET === 'change-me') {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_SECRET is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    }
    console.warn('⚠️ WARNING: JWT_SECRET not set. Using a random secret for this session — logins will be invalidated on restart.');
    process.env.JWT_SECRET = randomBytes(64).toString('hex');
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from './services/encryption.js';
import { ensureBucket } from './services/storage.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { transactionRoutes } from './routes/transactions.js';
import { budgetRoutes } from './routes/budgets.js';
import { goalRoutes } from './routes/goals.js';
import { chatRoutes } from './routes/chat.js';
import { documentRoutes } from './routes/documents.js';
import { insightRoutes } from './routes/insights.js';
import { advisorRoutes } from './routes/advisors.js';
import { contentRoutes } from './routes/content.js';
import { analyticsRoutes } from './routes/analytics.js';
import { notificationRoutes } from './routes/notifications.js';
import { partnerRoutes } from './routes/partners.js';
import { adminRoutes } from './routes/admin.js';
import { gamificationRoutes } from './routes/gamification.js';
import { messageRoutes } from './routes/messages.js';
import { recommendationRoutes } from './routes/recommendations.js';
import { callRoutes } from './routes/calls.js';
import { flagRoutes } from './routes/flags.js';
import { chatroomRoutes } from './routes/chatrooms.js';

// ─── Prisma Client ──────────────────────────────────────────────
const basePrisma = new PrismaClient();

export const prisma = basePrisma.$extends({
    query: {
        user: {
            async $allOperations({ operation, args, query }) {
                // Intercept data for write operations to encrypt
                const encryptFields = (data: any) => {
                    if (!data) return;
                    if (data.legalDocNumber && typeof data.legalDocNumber === 'string') data.legalDocNumber = encrypt(data.legalDocNumber);
                    if (data.regulatoryRegNumber && typeof data.regulatoryRegNumber === 'string') data.regulatoryRegNumber = encrypt(data.regulatoryRegNumber);
                    if (data.businessId && typeof data.businessId === 'string') data.businessId = encrypt(data.businessId);
                };

                if (['create', 'update', 'upsert'].includes(operation)) {
                    if ((args as any).data) encryptFields((args as any).data);
                    if ((args as any).create) encryptFields((args as any).create);
                    if ((args as any).update) encryptFields((args as any).update);
                }

                const result = await query(args);

                // Intercept result for read operations to decrypt
                const decryptFields = (record: any) => {
                    if (!record) return record;
                    if (record.legalDocNumber) record.legalDocNumber = decrypt(record.legalDocNumber);
                    if (record.regulatoryRegNumber) record.regulatoryRegNumber = decrypt(record.regulatoryRegNumber);
                    if (record.businessId) record.businessId = decrypt(record.businessId);
                    return record;
                };

                if (Array.isArray(result)) return result.map(decryptFields);
                return decryptFields(result);
            },
        },
        advisorProfile: {
            async $allOperations({ operation, args, query }) {
                const encryptFields = (data: any) => {
                    if (!data) return;
                    if (data.baslMembershipId && typeof data.baslMembershipId === 'string') data.baslMembershipId = encrypt(data.baslMembershipId);
                };

                if (['create', 'update', 'upsert'].includes(operation)) {
                    if ((args as any).data) encryptFields((args as any).data);
                    if ((args as any).create) encryptFields((args as any).create);
                    if ((args as any).update) encryptFields((args as any).update);
                }

                const result = await query(args);

                const decryptFields = (record: any) => {
                    if (!record) return record;
                    if (record.baslMembershipId) record.baslMembershipId = decrypt(record.baslMembershipId);
                    return record;
                };

                if (Array.isArray(result)) return result.map(decryptFields);
                return decryptFields(result);
            },
        },
    },
});

// ─── Fastify App ─────────────────────────────────────────────────
const app = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: { colorize: true },
        },
    },
});

export { app };

// ─── Bootstrap ───────────────────────────────────────────────────
async function main() {
    // ─── Plugins ─────────────────────────────────────────────────
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
    const allowedOrigins = allowedOriginsEnv
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);

    app.register(cors, {
        origin: (origin, cb) => {
            // Allow requests with no origin (mobile apps, Postman, server-to-server)
            if (!origin) return cb(null, true);
            if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                return cb(null, true);
            }
            return cb(new Error(`Origin ${origin} not allowed by CORS`), false);
        },
        credentials: true,
    });

    app.register(jwt, {
        secret: process.env.JWT_SECRET as string,
    });

    app.register(multipart, {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    });

    app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });

    // ─── OpenAPI docs at /api/docs ───────────────────────────────
    await app.register(swagger, {
        openapi: {
            info: { title: 'FinSaathi API', description: 'FinSaathi backend REST API', version: '1.0.0' },
            components: {
                securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
            },
            security: [{ bearerAuth: [] }],
        },
    });
    await app.register(swaggerUi, { routePrefix: '/api/docs' });

    // ─── Auth Decorator ──────────────────────────────────────────
    app.decorate('authenticate', async function (request: any, reply: any) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // ─── Routes ──────────────────────────────────────────────────
    app.register(authRoutes, { prefix: '/api/auth' });
    app.register(userRoutes, { prefix: '/api/users' });
    app.register(transactionRoutes, { prefix: '/api/transactions' });
    app.register(budgetRoutes, { prefix: '/api/budgets' });
    app.register(goalRoutes, { prefix: '/api/goals' });
    app.register(chatRoutes, { prefix: '/api/chat' });
    app.register(documentRoutes, { prefix: '/api/documents' });
    app.register(insightRoutes, { prefix: '/api/insights' });
    app.register(advisorRoutes, { prefix: '/api/advisors' });
    app.register(contentRoutes, { prefix: '/api/content' });
    app.register(notificationRoutes, { prefix: '/api/notifications' });
    app.register(partnerRoutes, { prefix: '/api/partners' });
    app.register(adminRoutes, { prefix: '/api/admin' });
    app.register(messageRoutes, { prefix: '/api/messages' });
    app.register(recommendationRoutes, { prefix: '/api/recommendations' });
    app.register(callRoutes, { prefix: '/api/calls' });
    app.register(flagRoutes, { prefix: '/api/flags' });
    app.register(chatroomRoutes, { prefix: '/api/chatrooms' });
    app.register(gamificationRoutes, { prefix: '/api/gamification' });
    app.register(analyticsRoutes, { prefix: '/api/analytics' });

    // ─── Ensure MinIO bucket exists ───────────────────────────
    ensureBucket().catch(err => app.log.warn(err, '[MinIO] Bucket setup failed — document uploads may not work'));

    // ─── Global Error Handler ─────────────────────────────────
    app.setErrorHandler((error: any, request, reply) => {
        app.log.error(error);
        const status = error.statusCode || 500;
        return reply.status(status).send({
            error: status >= 500 ? 'Internal Server Error' : error.message,
            ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
        });
    });

    // ─── Health Check ──────────────────────────────────────────
    app.get('/api/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'finsaathi-backend',
    }));

    // ─── Root Route ────────────────────────────────────────────
    app.get('/', async () => ({
        message: 'Welcome to FinSaathi API',
        status: 'ok',
        docs: '/api/docs',
    }));

    // ─── Start ─────────────────────────────────────────────────
    const PORT = parseInt(process.env.PORT || '3001');
    const HOST = process.env.HOST || '0.0.0.0';

    try {
        await app.listen({ port: PORT, host: HOST });
        console.log(`🏛️  FinSaathi Backend running at http://${HOST}:${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

main();
