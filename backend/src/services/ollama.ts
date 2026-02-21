import { Ollama, Tool, Message } from 'ollama';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

let ollamaClient: Ollama | null = null;

function getClient(): Ollama {
    if (!ollamaClient) {
        ollamaClient = new Ollama({ host: OLLAMA_BASE_URL });
    }
    return ollamaClient;
}

// ─── System Prompt for FinSaathi AI ──────────────────────────────
export function getSystemPrompt(toolContext: string): string {
    return `You are FinSaathi, an AI-powered personal finance advisor designed for Indian users, especially those from underserved communities — first-time earners, gig workers, daily-wage laborers, and rural users.

## Your Personality
- Warm, empathetic, and encouraging. Never judgmental about spending habits.
- Use simple language. Avoid jargon. Explain concepts like you're talking to a friend.
- Use Indian context: SIPs, UPI, PPF, chit funds, EMIs, festivals, and local examples.
- Include ₹ amounts and Indian references (e.g., "That's like saving ₹5 per chai you skip").
- Celebrate small wins. Financial growth is a journey.
- Use occasional emojis for warmth: 🎉 ✨ 💪 📊

## Your Capabilities
You have access to the user's real financial data through the following tools. Use them when the user's question requires factual data:

${toolContext}

## Important Rules
1. NEVER hallucinate financial figures. If you don't have data, say so honestly.
2. Always base advice on the user's actual data when available.
3. Keep responses concise (2-4 paragraphs max). Users should not feel overwhelmed.
4. When recommending investments, always mention risks. Add disclaimer when needed.
5. For complex decisions (loans, insurance), recommend consulting a human financial advisor.
6. Respect privacy — never suggest sharing financial data with unknown parties.
7. If user mentions financial stress, be extra empathetic and practical.

## Response Format
- Use bullet points for lists
- Bold key numbers and recommendations
- End with a question or call-to-action to keep the conversation going`;
}

// ─── Chat with Ollama ────────────────────────────────────────────
export async function chatWithOllama(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
): Promise<string> {
    try {
        const client = getClient();

        const response = await client.chat({
            model: OLLAMA_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content,
                })),
            ],
            options: {
                temperature: 0.7,
                top_p: 0.9,
                num_predict: 1024,
            },
        });

        return response.message.content;
    } catch (error: any) {
        console.error('Ollama error:', error.message);

        if (error.code === 'ECONNREFUSED') {
            return `I'm having trouble connecting to my AI engine right now. Please make sure Ollama is running on your machine with:

\`\`\`
ollama serve
ollama pull llama3.1:8b
\`\`\`

In the meantime, I can still help you track expenses and manage your financial goals! 💪`;
        }

        return `I ran into a temporary issue processing your request. Could you try rephrasing your question? I'm here to help! 🙏`;
    }
}

// ─── Chat with Tools (Function Calling) ──────────────────────────
// Sends a message to Ollama with tool definitions. The LLM decides
// which tools to call. Returns either tool_calls or a direct response.
export interface ToolCallResult {
    type: 'tool_calls';
    toolCalls: Array<{ name: string; arguments: Record<string, any> }>;
}

export interface DirectResponse {
    type: 'direct';
    content: string;
}

export async function chatWithTools(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    tools: Tool[],
): Promise<ToolCallResult | DirectResponse> {
    try {
        const client = getClient();

        const response = await client.chat({
            model: OLLAMA_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content,
                })),
            ],
            tools,
            options: {
                temperature: 0.3, // Lower temp for more reliable tool selection
                top_p: 0.9,
                num_predict: 512,
            },
        });

        // Check if the LLM wants to call tools
        if (response.message.tool_calls && response.message.tool_calls.length > 0) {
            const toolCalls = response.message.tool_calls.map(tc => ({
                name: tc.function.name,
                arguments: tc.function.arguments as Record<string, any>,
            }));
            console.log('[Ollama] 🛠️  LLM requested tool calls:', toolCalls.map(t => t.name).join(', '));
            return { type: 'tool_calls', toolCalls };
        }

        // No tool calls — return direct text response
        console.log('[Ollama] 💬 LLM responded directly (no tools needed)');
        return { type: 'direct', content: response.message.content };
    } catch (error: any) {
        console.error('[Ollama] Tool calling error:', error.message);
        // Fallback: return a direct response asking to rephrase
        return {
            type: 'direct',
            content: 'I ran into a temporary issue. Could you try rephrasing your question? 🙏',
        };
    }
}

// ─── Generate Chat Title ─────────────────────────────────────────
// Creates a concise 3-5 word title from the first message in a chat.
export async function generateChatTitle(firstMessage: string): Promise<string> {
    try {
        const client = getClient();
        const response = await client.chat({
            model: OLLAMA_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'Generate a concise 3-5 word title summarizing the user\'s chat topic. Return ONLY the title text, no quotes, no punctuation at the end, no explanation.',
                },
                { role: 'user', content: firstMessage },
            ],
            options: {
                temperature: 0.3,
                num_predict: 20,
            },
        });

        const title = response.message.content.trim().replace(/^["']|["']$/g, '').slice(0, 80);
        return title || 'New Chat';
    } catch (error) {
        console.error('[Title Gen] Failed:', error);
        // Fallback: use first N chars of the message
        return firstMessage.slice(0, 40).trim() + (firstMessage.length > 40 ? '...' : '');
    }
}

// ─── Health Check ────────────────────────────────────────────────
export async function checkOllamaHealth(): Promise<boolean> {
    try {
        const client = getClient();
        await client.list();
        return true;
    } catch {
        return false;
    }
}
