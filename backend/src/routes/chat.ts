import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { z } from 'zod';
import { executeMCPTool, getToolDescriptionsForPrompt, getToolsForOllama } from '../services/mcp';
import { getSystemPrompt, chatWithOllama, chatWithTools, generateChatTitle } from '../services/ollama';
import { preProcessMessage, postProcessResponse } from '../services/translation';

const chatSchema = z.object({
    message: z.string().min(1),
    chatRoomId: z.string().nullish(),
});

export async function chatRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Send Chat Message ───────────────────────────────────────
    app.post('/', async (request: any, reply) => {
        const { message, chatRoomId: inputRoomId } = chatSchema.parse(request.body);
        const userId = request.user.userId;

        // ─── Resolve or Create Chat Room ──────────────────────────
        let chatRoomId = inputRoomId;
        let isFirstMessage = false;

        if (chatRoomId) {
            // Validate room belongs to user
            const room = await prisma.chatRoom.findFirst({ where: { id: chatRoomId, userId } });
            if (!room) return reply.status(404).send({ error: 'Chat room not found' });
            const msgCount = await prisma.chatMessage.count({ where: { chatRoomId } });
            isFirstMessage = msgCount === 0;
        } else {
            // Auto-create a new room
            const room = await prisma.chatRoom.create({
                data: { userId, type: 'AI_CHAT', title: 'New Chat' },
            });
            chatRoomId = room.id;
            isFirstMessage = true;
        }

        // ─── Multilingual: Strictly Use App Language ──────────────────
        const headerLang = request.headers['x-user-language'] as string | undefined;
        const effectiveLang = headerLang || request.user.language || 'en';
        const translationCtx = await preProcessMessage(message, effectiveLang);
        const englishMessage = translationCtx.translatedInput;

        // Save user message (original language)
        await prisma.chatMessage.create({
            data: { userId, chatRoomId, content: message, role: 'user' },
        });

        // Get recent chat history for context — scoped to this room
        const recentMessages = await prisma.chatMessage.findMany({
            where: { chatRoomId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        // Build system prompt
        const toolDescriptions = getToolDescriptionsForPrompt();
        let systemPrompt = getSystemPrompt(toolDescriptions);

        // Add language instruction if non-English
        if (translationCtx.needsTranslation) {
            systemPrompt += `\n\n## IMPORTANT: Language Instruction\nThe user is communicating in ${translationCtx.originalLang === 'hi' ? 'Hindi' : 'a regional Indian language'}. Their message has been translated to English for your processing. Respond ONLY in English — the system will handle translation back to the user's language. Keep financial terms (SIP, EMI, UPI, PPF) in English.`;
        }

        // Format message history for Ollama
        const chatHistory = recentMessages
            .reverse()
            .slice(0, -1) // Exclude the message we just saved
            .map((m: any) => ({ role: m.role, content: m.content }));

        chatHistory.push({ role: 'user', content: englishMessage });

        // ─── LLM Function Calling: Let the model decide which tools to use ───
        const ollamaTools = getToolsForOllama();
        let aiResponse: string;
        let toolsUsed: string[] = [];

        try {
            const toolDecision = await chatWithTools(systemPrompt, chatHistory, ollamaTools);

            if (toolDecision.type === 'tool_calls') {
                // The LLM wants to call tools — execute them
                const toolResults = await executeToolCalls(toolDecision.toolCalls, userId);
                toolsUsed = toolResults.map(r => r.tool);

                // Add tool results to the system prompt context
                let enrichedPrompt = systemPrompt;
                enrichedPrompt += '\n\n## Current User Data (retrieved via tool calls):\n';
                toolResults.forEach(result => {
                    enrichedPrompt += `\n### ${result.tool}:\n${JSON.stringify(result.data, null, 2)}\n`;
                });

                // Get the final AI response with tool data
                aiResponse = await chatWithOllama(enrichedPrompt, chatHistory);
            } else {
                // No tools needed — use the direct response
                aiResponse = toolDecision.content;
            }
        } catch (error) {
            console.error('[Chat] Function calling failed, falling back to direct chat:', error);
            // Fallback: direct chat without tools
            aiResponse = await chatWithOllama(systemPrompt, chatHistory);
        }

        // ─── Multilingual: Translate response back ────────────────
        if (translationCtx.needsTranslation) {
            aiResponse = await postProcessResponse(aiResponse, translationCtx.originalLang);
        }

        // Save AI response
        const savedResponse = await prisma.chatMessage.create({
            data: {
                userId,
                chatRoomId,
                content: aiResponse,
                role: 'assistant',
                toolCalls: toolsUsed.length > 0 ? JSON.stringify(toolsUsed) : null,
            },
        });

        // Touch room updatedAt
        await prisma.chatRoom.update({
            where: { id: chatRoomId },
            data: { updatedAt: new Date() },
        });

        // Auto-title on first message (fire and forget)
        if (isFirstMessage) {
            generateChatTitle(message).then(title => {
                prisma.chatRoom.update({ where: { id: chatRoomId! }, data: { title } }).catch(() => { });
            });
        }

        return reply.send({
            response: aiResponse,
            messageId: savedResponse.id,
            chatRoomId,
            toolsUsed,
            detectedLanguage: translationCtx.originalLang,
        });
    });

    // ─── Get Chat History ────────────────────────────────────────
    app.get('/history', async (request: any, reply) => {
        const userId = request.user.userId;
        const { limit: limitStr, roomId } = request.query as { limit?: string; roomId?: string };
        const limit = parseInt(limitStr || '50');

        const where: any = { userId };
        if (roomId) where.chatRoomId = roomId;

        const messages = await prisma.chatMessage.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: limit,
            select: {
                id: true,
                content: true,
                role: true,
                toolCalls: true,
                createdAt: true,
            },
        });

        return reply.send({ messages });
    });

    // ─── Clear Chat History ──────────────────────────────────────
    app.delete('/history', async (request: any, reply) => {
        const userId = request.user.userId;
        const { roomId } = request.query as { roomId?: string };

        if (roomId) {
            // Delete messages for this room only
            await prisma.chatMessage.deleteMany({ where: { chatRoomId: roomId, userId } });
            await prisma.chatRoom.deleteMany({ where: { id: roomId, userId } });
        } else {
            // Legacy: delete all
            await prisma.chatMessage.deleteMany({ where: { userId } });
            await prisma.chatRoom.deleteMany({ where: { userId } });
        }

        return reply.send({ success: true });
    });
}

// ─── Execute Tool Calls from LLM ────────────────────────────────
// Takes the tool calls selected by the LLM and executes them via
// the existing MCP tool execution layer.
async function executeToolCalls(
    toolCalls: Array<{ name: string; arguments: Record<string, any> }>,
    userId: string
): Promise<Array<{ tool: string; data: any }>> {
    const results: Array<{ tool: string; data: any }> = [];

    for (const tc of toolCalls) {
        try {
            console.log(`[MCP] Executing tool: ${tc.name}`, tc.arguments);
            const result = await executeMCPTool(tc.name, tc.arguments, userId);
            results.push(result);
        } catch (error) {
            console.error(`[MCP] Tool ${tc.name} failed:`, error);
            results.push({ tool: tc.name, data: { error: `Tool execution failed` } });
        }
    }

    return results;
}
