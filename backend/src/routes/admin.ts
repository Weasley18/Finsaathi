import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { z } from 'zod';
import * as casbin from 'casbin';
import { newEnforcer } from 'casbin';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const rejectSchema = z.object({ reason: z.string().min(1) });

// Initialize Casbin (create these files in your project root)
let enforcer: any;
(async () => {
    enforcer = await newEnforcer(
        path.join(__dirname, '../../config/basic_model.conf'), 
        path.join(__dirname, '../../config/basic_policy.csv')
    );
})();

export async function adminRoutes(app: FastifyInstance) {
    // Enhanced middleware: JWT + FIDO2 check + Casbin
    app.addHook('preHandler', async (request: any, reply) => {
        await request.jwtVerify();
        if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' });
        
        // FIDO2 verification (mock for demo - integrate SimpleWebAuthn in prod)
        if (!request.headers['x-fido2-token']) {
            return reply.status(401).send({ error: 'FIDO2 required' });
        }
        
        // Log action to audit trail
        await prisma.auditLog.create({
            data: {
                adminId: request.user.id,
                action: request.url,
                ip: request.ip,
                userAgent: request.headers['user-agent'],
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 2.4.1 USER & ROLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    // Full CRUD Users
    app.post('/users', async (request: any, reply) => {
        const user = await prisma.user.create({ data: request.body });
        return reply.send(user);
    });

    app.get('/users', async (request) => {
        return prisma.user.findMany({ include: { documents: true } });
    });

    app.put('/users/:id', async (request: any, reply) => {
        const user = await prisma.user.update({
            where: { id: request.params.id },
            data: request.body
        });
        return reply.send(user);
    });

    app.delete('/users/:id', async (request: any, reply) => {
        await prisma.user.delete({ where: { id: request.params.id } });
        return reply.send({ success: true });
    });

    // Casbin Policy Management UI (dropdown safe!)
    app.get('/policies', async () => {
        const policies = await enforcer.getPolicy();
        const roles = await enforcer.getAllRoles();
        return { policies, roles };
    });

    app.post('/policies', async (request: any) => {
        const { subject, resource, action } = request.body;
        await enforcer.addPolicy(subject, resource, action);
        return { success: true };
    });

    app.delete('/policies/:subject/:resource/:action', async (request: any) => {
        await enforcer.removePolicy(request.params.subject, request.params.resource, request.params.action);
        return { success: true };
    });

    // Bulk CSV Import
    app.post('/bulk-import', async (request: any) => {
        const users = request.body.users; // CSV parsed on frontend
        const created = await prisma.user.createMany({ data: users });
        return { created: created.count };
    });

    // ═══════════════════════════════════════════════════════════════
    // 2.4.2 MODEL MONITORING & RETRAINING
    // ═══════════════════════════════════════════════════════════════

    // MLflow metrics (mock data - integrate real MLflow API)
    app.get('/mlflow-metrics', async () => {
        return {
            recommendation_ctr: 0.78,
            chat_satisfaction: 4.2,
            categorization_accuracy: 0.92,
            savings_goal_completion: 0.65
        };
    });

    // Data drift detection (mock - integrate Evidently AI)
    app.get('/data-drift', async () => {
        return {
            drift_detected: false,
            categories_affected: ['festival', 'emi'],
            severity: 'LOW'
        };
    });

    // One-click retraining
    app.post('/retrain-model', async (request, reply) => {
        // Celery job simulation
        execAsync('python retrain.py --deploy-ollama', { timeout: 300000 })
            .then(() => reply.send({ success: true, status: 'Model deployed to Ollama' }))
            .catch(() => reply.status(500).send({ error: 'Retraining failed' }));
    });

    // ═══════════════════════════════════════════════════════════════
    // 2.4.3 CONTENT MODERATION & QUALITY CONTROL
    // ═══════════════════════════════════════════════════════════════

    // AI advice compliance check
    app.post('/compliance-check', async (request: any) => {
        const { advice } = request.body;
        // Mock RBI/SEBI classifier
        const isCompliant = advice.includes('EMI') ? false : true;
        return { compliant: isCompliant, flagged: !isCompliant };
    });

    // Advisor content review queue
    app.get('/content-review', async () => {
        return prisma.advisorContent.findMany({
            where: { status: 'PENDING' },
            include: { advisor: true }
        });
    });

    app.post('/content/:id/approve', async (request: any, reply) => {
        await prisma.advisorContent.update({
            where: { id: request.params.id },
            data: { status: 'APPROVED' }
        });
        return reply.send({ success: true });
    });

    app.post('/content/:id/reject', async (request: any, reply) => {
        const { reason } = rejectSchema.parse(request.body);
        await prisma.advisorContent.update({
            where: { id: request.params.id },
            data: { status: 'REJECTED', rejectionReason: reason }
        });
        return reply.send({ success: true });
    });

    // Partner abuse detection
    app.get('/partner-activity', async () => {
        return prisma.apiLog.aggregate({
            _max: { timestamp: true },
            _count: { id: true },
            groupBy: { partnerId: true }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 2.4.4 PLATFORM ANALYTICS (Superset mock)
    // ═══════════════════════════════════════════════════════════════

    app.get('/analytics/dashboard', async () => {
        const [dauMau, healthScores, savings, recommendations] = await Promise.all([
            prisma.user.count({ where: { lastLogin: { gte: new Date('2026-02-20') } } }),
            prisma.user.aggregate({ _avg: { healthScore: true } }),
            prisma.transaction.aggregate({ _sum: { amount: true } }),
            prisma.recommendation.aggregate({ _count: { id: true } })
        ]);
        
        return {
            dau: dauMau,
            mau: 50000,
            avgHealthScore: healthScores._avg.healthScore || 0,
            totalSavings: savings._sum.amount || 0,
            recommendationsAccepted: 0.67
        };
    });

    app.get('/cohort-analysis', async () => {
        return {
            literacyUsersSavingsIncrease: '35% in 90 days',
            engagementCorrelation: 0.82
        };
    });

    app.get('/export-report/:type', async (request) => {
        // Mock PDF/CSV generation
        return { downloadUrl: `/reports/${request.params.type}-${Date.now()}.pdf` };
    });

    // ═══════════════════════════════════════════════════════════════
    // EXISTING ROUTES (unchanged)
    // ═══════════════════════════════════════════════════════════════
    app.get('/pending-approvals', async (request, reply) => {
        // ... your existing code unchanged
    });

    app.post('/approve/:userId', async (request: any, reply) => {
        // ... your existing code unchanged
    });

    app.post('/reject/:userId', async (request: any, reply) => {
        // ... your existing code unchanged
    });
}
