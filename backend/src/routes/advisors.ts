import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { requireRole, requireTier, requireApproval } from '../middleware/rbac';
import { chatWithOllama, generateChatTitle } from '../services/ollama';
import {
    indexAdvisorNote,
    indexAdvisorChatResponse,
    retrieveAdvisorKnowledge,
    buildCloneSystemPrompt,
    buildCoPilotSystemPrompt,
} from '../services/advisorClone';

const assignClientSchema = z.object({
    clientId: z.string(),
});

const updateTierSchema = z.object({
    tier: z.enum(['FREE', 'PREMIUM']),
});

const noteSchema = z.object({
    content: z.string().min(1),
    clientId: z.string().optional(),
    category: z.enum(['action_plan', 'observation', 'advice', 'general_tip']).default('advice'),
});

const chatSchema = z.object({
    message: z.string().min(1),
    chatRoomId: z.string().nullish(),
});

export async function advisorRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── List All Advisors (User & Admin) ─────────────────────────
    app.get('/', {
        preHandler: [requireRole('ADMIN', 'END_USER')],
    }, async (request: any, reply) => {
        const userRole = request.user.role;
        const userId = request.user.userId;

        // Base where clause: Active & Approved Advisors
        const where: any = {
            role: 'ADVISOR',
            approvalStatus: 'APPROVED',
            isActive: true
        };

        const advisors = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                phone: userRole === 'ADMIN' ? true : false, // Hide phone from END_USERs in listing
                avatarUrl: true,
                advisorProfile: {
                    select: {
                        highestQualification: true,
                        feeModel: true,
                        areasOfExpertise: true,
                    }
                },
                _count: {
                    select: { advisorClients: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // ─── Match Logic for END_USER ─────────────────────────
        if (userRole === 'END_USER') {
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { areasOfInterest: true }
            });

            let userInterests: string[] = currentUser?.areasOfInterest || [];

            // Map and calculate match scores
            const scoredAdvisors = advisors.map(adv => {
                let expertises: string[] = adv.advisorProfile?.areasOfExpertise || [];

                // Calculate overlap
                const overlap = userInterests.filter(interest => expertises.includes(interest)).length;
                let matchScore = 0;

                if (userInterests.length > 0) {
                    // Match Score out of 100 based on percentage of interests covered
                    matchScore = Math.round((overlap / userInterests.length) * 100);
                } else {
                    // If user has no interests specified, randomly assign a neutral score so they all mix
                    matchScore = 50;
                }

                return {
                    ...adv,
                    parsedExpertise: expertises,
                    matchScore
                };
            });

            // Sort by highest match score first, then by least crowded
            scoredAdvisors.sort((a, b) => {
                if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
                return a._count.advisorClients - b._count.advisorClients;
            });

            return reply.send({ advisors: scoredAdvisors });
        }

        // For ADMIN, just return regular list
        return reply.send({ advisors });
    });

    // ─── Get Advisor Clients (Admin or The Advisor) ────────────────
    app.get('/:id/clients', {
        preHandler: [requireRole('ADMIN', 'ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userRole = request.user.role;
        const userId = request.user.userId;

        // Advisors can only view their own clients
        if (userRole === 'ADVISOR' && id !== userId) {
            return reply.status(403).send({ error: 'You can only view your own clients' });
        }

        const advisor = await prisma.user.findUnique({
            where: { id },
            include: {
                advisorClients: {
                    include: {
                        client: {
                            include: { financialProfile: true }
                        }
                    }
                }
            }
        });

        if (!advisor || advisor.role !== 'ADVISOR') {
            return reply.status(404).send({ error: 'Advisor not found' });
        }

        const clients = advisor.advisorClients.map(rel => ({
            id: rel.client.id,
            name: rel.client.name,
            phone: rel.client.phone,
            healthScore: rel.client.financialProfile?.healthScore || 0,
            assignedAt: rel.assignedAt,
        }));

        return reply.send({ clients });
    });

    // ─── Get Advisor Dashboard Stats ───────────────────────────
    app.get('/:id/stats', {
        preHandler: [requireRole('ADVISOR', 'ADMIN'), requireApproval()],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const userRole = request.user.role;
        const userId = request.user.userId;

        if (userRole === 'ADVISOR' && id !== userId) {
            return reply.status(403).send({ error: 'You can only view your own stats' });
        }

        // Get client IDs for this advisor
        const relations = await prisma.advisorClient.findMany({
            where: { advisorId: id },
            select: { clientId: true },
        });
        const clientIds = relations.map(r => r.clientId);

        // Count active goals across all clients
        const activeGoals = await prisma.goal.count({
            where: { userId: { in: clientIds }, status: 'ACTIVE' },
        });

        // Count recommendations sent by this advisor
        const recommendations = await prisma.recommendation.count({
            where: { advisorId: id },
        });

        // Per-client goal counts
        const clientGoals: Record<string, number> = {};
        if (clientIds.length > 0) {
            const goalCounts = await prisma.goal.groupBy({
                by: ['userId'],
                where: { userId: { in: clientIds }, status: 'ACTIVE' },
                _count: true,
            });
            goalCounts.forEach(g => { clientGoals[g.userId] = g._count; });
        }

        return reply.send({ activeGoals, recommendations, clientGoals });
    });

    // ─── Assign Client to Advisor (Admin Only) ─────────────────
    app.post('/:id/assign', {
        preHandler: [requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id: advisorId } = request.params as { id: string };
        const { clientId } = assignClientSchema.parse(request.body);

        const advisor = await prisma.user.findUnique({ where: { id: advisorId } });
        if (!advisor || advisor.role !== 'ADVISOR') {
            return reply.status(404).send({ error: 'Advisor not found' });
        }

        const client = await prisma.user.findUnique({ where: { id: clientId } });
        if (!client || client.role !== 'END_USER') {
            return reply.status(404).send({ error: 'Client not found or not an end user' });
        }

        const existing = await prisma.advisorClient.findUnique({
            where: { clientId }
        });

        if (existing) {
            if (existing.advisorId === advisorId) {
                return reply.status(400).send({ error: 'Client already assigned to this advisor' });
            }
            await prisma.advisorClient.update({
                where: { clientId },
                data: { advisorId }
            });
            return reply.send({ success: true, message: 'Client re-assigned successfully' });
        }

        await prisma.advisorClient.create({
            data: { advisorId, clientId }
        });

        return reply.send({ success: true, message: 'Client assigned successfully' });
    });

    // ─── Update Advisor Tier (Admin Only) ──────────────────────
    app.put('/:id/tier', {
        preHandler: [requireRole('ADMIN')],
    }, async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const { tier } = updateTierSchema.parse(request.body);

        const advisor = await prisma.user.findUnique({ where: { id } });
        if (!advisor || advisor.role !== 'ADVISOR') {
            return reply.status(404).send({ error: 'Advisor not found' });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { tier }
        });

        return reply.send({ success: true, advisor: updated });
    });

    // ─── Premium: List All Clients ─────────────────────────────
    app.get('/all-potential-clients', {
        preHandler: [requireRole('ADVISOR'), requireApproval(), requireTier('PREMIUM')],
    }, async (request: any, reply) => {
        const { unassignedOnly } = request.query as any;

        const where: any = { role: 'END_USER' };
        if (unassignedOnly === 'true') {
            where.assignedAdvisor = null;
        }

        const clients = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                phone: true,
                financialProfile: {
                    select: { healthScore: true }
                },
                assignedAdvisor: {
                    select: { advisor: { select: { name: true } } }
                }
            },
            take: 100
        });

        return reply.send({
            clients: clients.map(c => ({
                ...c,
                healthScore: c.financialProfile?.healthScore || 0,
                advisorName: c.assignedAdvisor?.advisor?.name || null
            }))
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  AI CO-PILOT: Advisor's AI Assistant with Cohort Data Access
    // ═══════════════════════════════════════════════════════════════

    app.post('/chat', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const { message, chatRoomId: inputRoomId } = chatSchema.parse(request.body);
        const advisorId = request.user.userId;

        // ─── Resolve or Create Chat Room ────────────────────────
        let chatRoomId = inputRoomId;
        let isFirstMessage = false;

        if (chatRoomId) {
            const room = await prisma.chatRoom.findFirst({ where: { id: chatRoomId, userId: advisorId } });
            if (!room) return reply.status(404).send({ error: 'Chat room not found' });
            const msgCount = await prisma.chatMessage.count({ where: { chatRoomId } });
            isFirstMessage = msgCount === 0;
        } else {
            const room = await prisma.chatRoom.create({
                data: { userId: advisorId, type: 'COPILOT', title: 'New Chat' },
            });
            chatRoomId = room.id;
            isFirstMessage = true;
        }

        const advisor = await prisma.user.findUnique({
            where: { id: advisorId },
            select: { name: true },
        });

        // ─── Aggregate Cohort Data ──────────────────────────────
        const assignedClients = await prisma.advisorClient.findMany({
            where: { advisorId },
            include: {
                client: {
                    include: {
                        financialProfile: true,
                        transactions: {
                            where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
                            select: { amount: true, type: true, category: true },
                        },
                        goals: { where: { status: 'ACTIVE' } },
                        budgets: true,
                    },
                },
            },
        });

        // Build cohort summary
        const cohortSummary = assignedClients.map(ac => {
            const c = ac.client;
            const income = c.transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
            const expense = c.transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
            const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : '0';

            return {
                name: c.name || 'Unknown',
                healthScore: c.financialProfile?.healthScore || 0,
                monthlyIncome: income,
                monthlyExpense: expense,
                savingsRate: `${savingsRate}%`,
                activeGoals: c.goals.length,
                budgets: c.budgets.length,
                topSpendingCategory: c.transactions
                    .filter(t => t.type === 'EXPENSE')
                    .reduce((acc: Record<string, number>, t) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                        return acc;
                    }, {} as Record<string, number>),
            };
        });

        // Aggregate stats
        const totalClients = cohortSummary.length;
        const avgHealthScore = totalClients > 0
            ? (cohortSummary.reduce((s, c) => s + c.healthScore, 0) / totalClients).toFixed(1)
            : '0';
        const atRiskClients = cohortSummary.filter(c => c.healthScore < 45);

        const cohortContext = `
Total Assigned Clients: ${totalClients}
Average Health Score: ${avgHealthScore}/100
At-Risk Clients (score < 45): ${atRiskClients.length}

Client Details:
${cohortSummary.map(c => `- ${c.name}: Health ${c.healthScore}/100, Savings Rate ${c.savingsRate}, Income ₹${c.monthlyIncome.toLocaleString()}, Expense ₹${c.monthlyExpense.toLocaleString()}, ${c.activeGoals} goals`).join('\n')}

${atRiskClients.length > 0 ? `\n⚠️ AT-RISK CLIENTS:\n${atRiskClients.map(c => `- ${c.name}: Score ${c.healthScore}, Savings Rate ${c.savingsRate}`).join('\n')}` : ''}
`.trim();

        const systemPrompt = buildCoPilotSystemPrompt(advisor?.name || 'Advisor', cohortContext);

        // Get chat history — scoped to this room
        const recentMessages = await prisma.chatMessage.findMany({
            where: { chatRoomId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        await prisma.chatMessage.create({
            data: { userId: advisorId, chatRoomId, content: message, role: 'user' },
        });

        const chatHistory = recentMessages.reverse().map(m => ({
            role: m.role,
            content: m.content,
        }));
        chatHistory.push({ role: 'user', content: message });

        const aiResponse = await chatWithOllama(systemPrompt, chatHistory);

        // Save and index the response
        const saved = await prisma.chatMessage.create({
            data: { userId: advisorId, chatRoomId, content: aiResponse, role: 'assistant' },
        });

        // Touch room updatedAt
        await prisma.chatRoom.update({
            where: { id: chatRoomId! },
            data: { updatedAt: new Date() },
        });

        // Auto-title on first message
        if (isFirstMessage) {
            generateChatTitle(message).then(title => {
                prisma.chatRoom.update({ where: { id: chatRoomId! }, data: { title } }).catch(() => {});
            });
        }

        // Index the Q&A pair for the clone
        await indexAdvisorChatResponse(advisorId, saved.id, message, aiResponse);

        return reply.send({
            response: aiResponse,
            messageId: saved.id,
            chatRoomId,
            cohortStats: {
                totalClients,
                avgHealthScore,
                atRiskCount: atRiskClients.length,
            },
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  ADVISOR NOTES: Feed the Clone's Knowledge Base
    // ═══════════════════════════════════════════════════════════════

    // ─── Save Note & Index in ChromaDB ──────────────────────────
    app.post('/notes', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const { content, clientId, category } = noteSchema.parse(request.body);
        const advisorId = request.user.userId;

        // Save to database
        const note = await prisma.advisorNote.create({
            data: {
                advisorId,
                clientId,
                content,
                category,
            },
        });

        // Index in ChromaDB for the clone
        let clientName: string | undefined;
        if (clientId) {
            const client = await prisma.user.findUnique({ where: { id: clientId }, select: { name: true } });
            clientName = client?.name || undefined;
        }

        const indexResult = await indexAdvisorNote(advisorId, note.id, content, {
            category,
            clientId,
            clientName,
        });

        // Mark as indexed
        if (indexResult.chunksIndexed > 0) {
            await prisma.advisorNote.update({
                where: { id: note.id },
                data: { isIndexed: true },
            });
        }

        return reply.status(201).send({
            success: true,
            note,
            indexed: indexResult.chunksIndexed > 0,
            chunksIndexed: indexResult.chunksIndexed,
        });
    });

    // ─── List Advisor Notes ─────────────────────────────────────
    app.get('/notes', {
        preHandler: [requireRole('ADVISOR'), requireApproval()],
    }, async (request: any, reply) => {
        const advisorId = request.user.userId;
        const { clientId } = request.query as any;

        const where: any = { advisorId };
        if (clientId) where.clientId = clientId;

        const notes = await prisma.advisorNote.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return reply.send({ notes });
    });

    // ═══════════════════════════════════════════════════════════════
    //  ADVISOR AI CLONE: Mimics Advisor's Style When Offline
    //  Uses Few-Shot Prompting + RAG on advisor's past answers
    // ═══════════════════════════════════════════════════════════════

    app.post('/clone/chat', {
        preHandler: [requireRole('END_USER')],
    }, async (request: any, reply) => {
        const { message, chatRoomId: inputRoomId } = chatSchema.parse(request.body);
        const userId = request.user.userId;

        // ─── Resolve or Create Chat Room ────────────────────────
        let chatRoomId = inputRoomId;
        let isFirstMessage = false;

        if (chatRoomId) {
            const room = await prisma.chatRoom.findFirst({ where: { id: chatRoomId, userId } });
            if (!room) return reply.status(404).send({ error: 'Chat room not found' });
            const msgCount = await prisma.chatMessage.count({ where: { chatRoomId } });
            isFirstMessage = msgCount === 0;
        } else {
            const room = await prisma.chatRoom.create({
                data: { userId, type: 'ADVISOR_CLONE', title: 'New Chat' },
            });
            chatRoomId = room.id;
            isFirstMessage = true;
        }

        // Find the user's assigned advisor
        const assignment = await prisma.advisorClient.findUnique({
            where: { clientId: userId },
            include: {
                advisor: {
                    select: { id: true, name: true, isActive: true },
                },
            },
        });

        if (!assignment) {
            return reply.status(404).send({
                error: 'No advisor assigned. Please contact support to get matched with an advisor.',
            });
        }

        const advisor = assignment.advisor;

        // ─── RAG: Retrieve Advisor's Past Advice ────────────────
        const knowledge = await retrieveAdvisorKnowledge(advisor.id, message);

        console.log(`[AdvisorClone] Retrieved ${knowledge.results.length} past advice snippets for ${advisor.name}`);

        // ─── Get Client Financial Context ────────────────────────
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [profile, transactions, goals, budgets] = await Promise.all([
            prisma.financialProfile.findUnique({ where: { userId } }),
            prisma.transaction.findMany({
                where: { userId, date: { gte: startOfMonth } },
                select: { amount: true, type: true, category: true },
            }),
            prisma.goal.findMany({ where: { userId, status: 'ACTIVE' } }),
            prisma.budget.findMany({ where: { userId } }),
        ]);

        const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

        const clientContext = `
Client Health Score: ${profile?.healthScore || 'N/A'}/100
Monthly Income: ₹${income.toLocaleString()}
Monthly Expense: ₹${expense.toLocaleString()}
Savings Rate: ${income > 0 ? ((income - expense) / income * 100).toFixed(1) : '0'}%
Active Goals: ${goals.map(g => `${g.name} (₹${g.currentAmount.toLocaleString()}/₹${g.targetAmount.toLocaleString()})`).join(', ') || 'None'}
Budgets: ${budgets.map(b => `${b.category}: ₹${b.spent.toLocaleString()}/₹${b.limit.toLocaleString()}`).join(', ') || 'None'}
`.trim();

        // ─── Build Clone Prompt with Few-Shot Examples ───────────
        const systemPrompt = buildCloneSystemPrompt(
            advisor.name || 'Your Advisor',
            knowledge.results,
            clientContext
        );

        // Get chat history — scoped to this room
        const recentMessages = await prisma.chatMessage.findMany({
            where: { chatRoomId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        await prisma.chatMessage.create({
            data: { userId, chatRoomId, content: message, role: 'user' },
        });

        const chatHistory = recentMessages.reverse().map(m => ({
            role: m.role,
            content: m.content,
        }));
        chatHistory.push({ role: 'user', content: message });

        const aiResponse = await chatWithOllama(systemPrompt, chatHistory);

        const saved = await prisma.chatMessage.create({
            data: {
                userId,
                chatRoomId,
                content: aiResponse,
                role: 'assistant',
                toolCalls: JSON.stringify(['advisor_clone']),
            },
        });

        // Touch room updatedAt
        await prisma.chatRoom.update({
            where: { id: chatRoomId! },
            data: { updatedAt: new Date() },
        });

        // Auto-title on first message
        if (isFirstMessage) {
            generateChatTitle(message).then(title => {
                prisma.chatRoom.update({ where: { id: chatRoomId! }, data: { title } }).catch(() => {});
            });
        }

        return reply.send({
            response: aiResponse,
            messageId: saved.id,
            chatRoomId,
            advisorName: advisor.name,
            isClone: true,
            advisorOnline: advisor.isActive,
            ragResultsUsed: knowledge.results.length,
        });
    });
}

