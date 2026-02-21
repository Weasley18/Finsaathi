import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { transactionRoutes } from './routes/transactions';
import { budgetRoutes } from './routes/budgets';
import { goalRoutes } from './routes/goals';
import { chatRoutes } from './routes/chat';
import { documentRoutes } from './routes/documents';
import { insightRoutes } from './routes/insights';
import { advisorRoutes } from './routes/advisors';
import { contentRoutes } from './routes/content';
import { notificationRoutes } from './routes/notifications';
import { partnerRoutes } from './routes/partners';
import { adminRoutes } from './routes/admin';

// ─── Prisma Client ──────────────────────────────────────────────
export const prisma = new PrismaClient();

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
    app.register(cors, {
        origin: true,
        credentials: true,
    });

    app.register(jwt, {
        secret: process.env.JWT_SECRET || 'finsaathi-dev-secret',
    });

    app.register(multipart, {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    });

    app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });

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

    // ─── Health Check ──────────────────────────────────────────
    app.get('/api/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'finsaathi-backend',
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
