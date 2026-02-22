// ─── Content Generator Service ───────────────────────────────────
// Uses Ollama LLM to generate financial literacy lessons, quizzes,
// and personalized topic suggestions for FinSaathi users.

import { chatWithOllama } from './ollama.js';
import { prisma } from '../server.js';

// ─── Generate a Lesson ──────────────────────────────────────────
export async function generateLesson(
    topic: string,
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER',
    userContext?: { incomeRange?: string; riskProfile?: string }
): Promise<{
    title: string;
    description: string;
    content: string;
    category: string;
    estimatedDuration: string;
}> {
    const contextStr = userContext
        ? `\nTarget audience: Income ${userContext.incomeRange || 'general'}, Risk profile: ${userContext.riskProfile || 'moderate'}.`
        : '';

    const systemPrompt = `You are a financial education content creator for FinSaathi, an app for Indian users from underserved communities.
Generate a bite-sized financial literacy lesson on the given topic.
${contextStr}

RULES:
- Respond ONLY in English. DO NOT use Hinglish or Hindi words.
- Include ₹ amounts relevant to Indian context
- Use relatable examples (chai, auto-rickshaw, kirana store, festival shopping)
- Keep it practical and actionable
- Difficulty level: ${difficulty}
- Duration: 2-3 minutes reading time

Return ONLY a valid JSON object (no markdown formatting, no code blocks):
{
  "title": "Catchy title (max 60 chars)",
  "description": "One-line summary (max 120 chars)",
  "content": "Full lesson in Markdown format (500-800 words). Use ## headings, bullet points, bold key terms, and real-world examples. End with a 'Key Takeaway' section.",
  "category": "One of: Basics, Savings, Investment, Budgeting, Credit, Loans, Insurance, Tax, Security, Digital Payments",
  "estimatedDuration": "X min"
}`;

    const response = await chatWithOllama(systemPrompt, [
        { role: 'user', content: `Generate a financial literacy lesson about: ${topic}` }
    ]);

    try {
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return {
            title: parsed.title || topic,
            description: parsed.description || `Learn about ${topic}`,
            content: parsed.content || '',
            category: parsed.category || 'Basics',
            estimatedDuration: parsed.estimatedDuration || '3 min',
        };
    } catch (e) {
        // Fallback: treat entire response as content
        return {
            title: topic,
            description: `Learn about ${topic}`,
            content: response,
            category: 'Basics',
            estimatedDuration: '3 min',
        };
    }
}

// ─── Generate Quizzes for a Lesson ──────────────────────────────
export async function generateQuizzes(
    lessonContent: string,
    lessonTitle: string,
    count: number = 3
): Promise<Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}>> {
    const systemPrompt = `You are a quiz creator for financial literacy lessons.
Generate ${count} multiple-choice quiz questions based on the lesson content provided.

RULES:
- Respond ONLY in English. DO NOT use Hinglish or Hindi words.
- Each question should test understanding, not just recall
- Use practical Indian financial context in options
- Include one clearly correct answer and 3 plausible distractors
- Provide a brief explanation for the correct answer

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]`;

    const response = await chatWithOllama(systemPrompt, [
        { role: 'user', content: `Lesson title: "${lessonTitle}"\n\nLesson content:\n${lessonContent.substring(0, 2000)}` }
    ]);

    try {
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) {
            return parsed.map(q => ({
                question: q.question || '',
                options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
                correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
                explanation: q.explanation || '',
            }));
        }
    } catch (e) {
        console.error('[ContentGenerator] Failed to parse quiz JSON:', e);
    }

    // Fallback: return a simple quiz
    return [{
        question: `What is the main takeaway from the lesson "${lessonTitle}"?`,
        options: ['Understanding basics', 'Ignoring finances', 'Spending more', 'Avoiding savings'],
        correctIndex: 0,
        explanation: 'The lesson focuses on understanding financial basics to make better decisions.',
    }];
}

// ─── Suggest Learning Topics ────────────────────────────────────
export async function suggestTopics(userId: string): Promise<Array<{
    topic: string;
    reason: string;
    difficulty: string;
    category: string;
}>> {
    // Fetch user's financial context
    const [user, transactions, budgets, goals, profile] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { incomeRange: true, riskProfile: true } }),
        prisma.transaction.findMany({
            where: { userId, type: 'EXPENSE' },
            orderBy: { date: 'desc' },
            take: 50,
            select: { category: true, amount: true },
        }),
        prisma.budget.findMany({ where: { userId } }),
        prisma.goal.findMany({ where: { userId, status: 'ACTIVE' } }),
        prisma.financialProfile.findUnique({ where: { userId } }),
    ]);

    // Determine completed lesson topics to avoid repetition
    const completedLessons = await prisma.lessonProgress.findMany({
        where: { userId },
        include: { lesson: { select: { category: true, title: true } } },
    });
    const completedCategories = completedLessons.map((lp: any) => lp.lesson.category);

    // Build context string
    const topCategories = transactions.reduce((acc: Record<string, number>, t: any) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});
    const topSpending = (Object.entries(topCategories) as [string, number][])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ₹${Math.round(amt)}`)
        .join(', ');

    const context = `
User profile: Income ${user?.incomeRange || 'unknown'}, Risk ${user?.riskProfile || 'unknown'}
Top spending: ${topSpending || 'No data yet'}
Active goals: ${goals.length > 0 ? goals.map((g: any) => g.name).join(', ') : 'None'}
Budgets set: ${budgets.length}
Health score: ${profile?.healthScore || 'Not calculated'}
Already completed categories: ${completedCategories.join(', ') || 'None'}
`;

    const systemPrompt = `You are a financial education advisor for FinSaathi.
Respond ONLY in English. DO NOT use Hinglish or Hindi words.
Based on the user's financial profile, suggest 5 personalized lesson topics they should learn next.
Focus on their weak areas and financial pain points.

User context:
${context}

Return ONLY a valid JSON array (no markdown):
[
  {
    "topic": "Short topic title",
    "reason": "Why this is relevant for this user (1 sentence)",
    "difficulty": "BEGINNER or INTERMEDIATE or ADVANCED",
    "category": "Basics/Savings/Investment/Budgeting/Credit/Loans/Insurance/Tax/Security/Digital Payments"
  }
]`;

    const response = await chatWithOllama(systemPrompt, [
        { role: 'user', content: 'Suggest personalized financial lessons for me.' }
    ]);

    try {
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) {
            return parsed.slice(0, 5).map(s => ({
                topic: s.topic || 'Financial Basics',
                reason: s.reason || 'Important for your financial journey',
                difficulty: s.difficulty || 'BEGINNER',
                category: s.category || 'Basics',
            }));
        }
    } catch (e) {
        console.error('[ContentGenerator] Failed to parse suggestions:', e);
    }

    // Fallback suggestions
    return [
        { topic: 'Building an Emergency Fund', reason: 'Essential safety net for unexpected expenses', difficulty: 'BEGINNER', category: 'Savings' },
        { topic: 'Understanding UPI Payments', reason: 'Master digital payments for daily use', difficulty: 'BEGINNER', category: 'Digital Payments' },
        { topic: 'How SIP Works', reason: 'Start investing with as little as ₹500/month', difficulty: 'BEGINNER', category: 'Investment' },
        { topic: 'Budgeting with 50/30/20 Rule', reason: 'Simple framework to manage your money', difficulty: 'BEGINNER', category: 'Budgeting' },
        { topic: 'Protecting Against UPI Fraud', reason: 'Stay safe while using digital payments', difficulty: 'BEGINNER', category: 'Security' },
    ];
}
