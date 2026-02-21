// ─── Advisor AI Clone Service ────────────────────────────────────
// Indexes advisor's notes, advice, and past answers into ChromaDB.
// When the advisor is offline, the AI retrieves their past advice
// via RAG and uses few-shot prompting to mimic their advice style.

import { ChromaClient, Collection } from 'chromadb';

const client = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

const CHUNK_SIZE = 800;    // Advisor notes tend to be longer, more meaningful chunks
const CHUNK_OVERLAP = 100;
const TOP_K = 5;

// ─── Get Advisor's Knowledge Base Collection ────────────────────
async function getAdvisorCollection(advisorId: string): Promise<Collection> {
    const collectionName = `advisor_${advisorId.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 63);
    return client.getOrCreateCollection({
        name: collectionName,
        metadata: { 'hnsw:space': 'cosine' },
    });
}

// ─── Chunk Text ──────────────────────────────────────────────────
function chunkText(text: string): string[] {
    if (text.length <= CHUNK_SIZE) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        chunks.push(text.slice(start, end));
        start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks.filter(c => c.trim().length > 30);
}

// ─── Index Advisor Note ─────────────────────────────────────────
// Stores an advisor's note/advice in their ChromaDB collection.
// Called whenever an advisor saves a note or sends advice to a client.
export async function indexAdvisorNote(
    advisorId: string,
    noteId: string,
    content: string,
    metadata: {
        category?: string;
        clientId?: string;
        clientName?: string;
    } = {}
): Promise<{ chunksIndexed: number }> {
    try {
        const collection = await getAdvisorCollection(advisorId);
        const chunks = chunkText(content);

        if (chunks.length === 0) return { chunksIndexed: 0 };

        const ids = chunks.map((_, i) => `${noteId}_chunk_${i}`);
        const metadatas = chunks.map((_, i) => ({
            noteId,
            category: metadata.category || 'general',
            clientId: metadata.clientId || '',
            clientName: metadata.clientName || '',
            chunkIndex: i,
            totalChunks: chunks.length,
        }));

        await collection.add({
            ids,
            documents: chunks,
            metadatas,
        });

        console.log(`[AdvisorClone] Indexed ${chunks.length} chunks for advisor ${advisorId}`);
        return { chunksIndexed: chunks.length };
    } catch (error) {
        console.error('[AdvisorClone] Error indexing note:', error);
        return { chunksIndexed: 0 };
    }
}

// ─── Index Advisor Chat Messages ────────────────────────────────
// Indexes the advisor's actual chat responses (from the co-pilot)
// to learn their communication style and preferences.
export async function indexAdvisorChatResponse(
    advisorId: string,
    messageId: string,
    userQuery: string,
    advisorResponse: string
): Promise<void> {
    try {
        const collection = await getAdvisorCollection(advisorId);

        // Store as a Q&A pair for better few-shot retrieval
        const qaPair = `Question: ${userQuery}\n\nAdvisor's Response: ${advisorResponse}`;

        await collection.add({
            ids: [`chat_${messageId}`],
            documents: [qaPair],
            metadatas: [{
                category: 'chat_response',
                type: 'qa_pair',
            }],
        });
    } catch (error) {
        console.error('[AdvisorClone] Error indexing chat response:', error);
    }
}

// ─── Retrieve Advisor's Past Advice ─────────────────────────────
// Searches the advisor's knowledge base for advice similar to the
// current user query. Returns past answers for few-shot prompting.
export async function retrieveAdvisorKnowledge(
    advisorId: string,
    query: string,
    topK: number = TOP_K
): Promise<{
    results: Array<{ text: string; category: string; score: number }>;
}> {
    try {
        const collection = await getAdvisorCollection(advisorId);

        const results = await collection.query({
            queryTexts: [query],
            nResults: topK,
        });

        if (!results.documents?.[0]?.length) {
            return { results: [] };
        }

        return {
            results: results.documents[0].map((doc, i) => ({
                text: doc || '',
                category: (results.metadatas?.[0]?.[i] as any)?.category || 'general',
                score: results.distances?.[0]?.[i] ? 1 - results.distances[0][i] : 0,
            })),
        };
    } catch (error) {
        console.error('[AdvisorClone] Error retrieving knowledge:', error);
        return { results: [] };
    }
}

// ─── Build Clone System Prompt ──────────────────────────────────
// Creates a system prompt that mimics the advisor's style using
// their past advice as few-shot examples.
export function buildCloneSystemPrompt(
    advisorName: string,
    pastAdvice: Array<{ text: string; category: string }>,
    clientContext: string
): string {
    const fewShotExamples = pastAdvice
        .slice(0, 4) // limit to 4 examples to avoid prompt bloat
        .map((a, i) => `Example ${i + 1}:\n${a.text}`)
        .join('\n\n---\n\n');

    return `You are an AI clone of ${advisorName}, a financial advisor on FinSaathi. Your job is to provide financial advice EXACTLY in the style and tone of ${advisorName}. 

## How to Mimic ${advisorName}'s Style
Study these examples of ${advisorName}'s past advice carefully. Match their:
- Tone (formal vs casual, empathetic vs direct)
- Level of detail (brief vs thorough)
- Use of examples and analogies
- Specific recommendations they tend to make
- How they frame risk and opportunities

## ${advisorName}'s Past Advice Examples:
${fewShotExamples || 'No past advice available yet. Use a warm, professional Indian financial advisor tone.'}

## Current Client Context:
${clientContext}

## Rules:
1. Always advise as ${advisorName} would — match their personality and style.
2. Use Indian financial context (SIPs, PPF, UPI, EMIs, ₹ amounts).
3. Be warm and encouraging. Never judgmental.
4. If you're unsure about something, recommend the client wait for ${advisorName} to come online.
5. Add a note at the end: "🤖 This advice was generated by ${advisorName}'s AI clone. For personalized guidance, please wait for ${advisorName} to come online."
6. NEVER hallucinate financial figures. Use data provided in client context.
7. Keep responses concise (2-3 paragraphs).`;
}

// ─── Build Co-Pilot System Prompt ────────────────────────────────
// System prompt for the advisor's AI co-pilot (cohort-level access)
export function buildCoPilotSystemPrompt(advisorName: string, cohortContext: string): string {
    return `You are FinSaathi AI Co-Pilot, an intelligent assistant for ${advisorName}, a financial advisor on the FinSaathi platform.

## Your Role
You help ${advisorName} manage their cohort of clients more effectively. You have access to aggregated data about their assigned clients.

## Capabilities
- Analyze cohort-wide financial patterns
- Identify users who need immediate attention (at-risk users)
- Draft personalized action plans for individual clients
- Suggest financial tips to send to the cohort
- Answer questions about cohort trends and statistics

## Cohort Data:
${cohortContext}

## Rules:
1. Always present data clearly with numbers and percentages.
2. Flag urgent cases first (income loss, overspending, missed goals).
3. When drafting communications, use simple Hindi-English mix that resonates with Indian users.
4. Suggest specific actions, not vague advice.
5. Protect client privacy — never share one client's data in advice for another.
6. Use ₹ amounts and Indian financial context.
7. Be concise and actionable. Advisors are busy.`;
}
