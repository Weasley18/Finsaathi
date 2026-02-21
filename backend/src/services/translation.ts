import { chatWithOllama } from './ollama';

// ─── Multilingual Translation Service ────────────────────────────
// Uses Ollama LLM to translate between Indian languages and English.
// For hackathon: Uses LLM-based translation. In production, swap
// with IndicTrans2 or Google Translate API for better accuracy.

const SUPPORTED_LANGUAGES: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    bn: 'Bengali',
    mr: 'Marathi',
    gu: 'Gujarati',
    kn: 'Kannada',
    ml: 'Malayalam',
    pa: 'Punjabi',
    or: 'Odia',
};

// ─── Language Detection ──────────────────────────────────────────
// Uses Unicode ranges to detect Indic scripts
export function detectLanguage(text: string): string {
    // Devanagari: U+0900-U+097F (Hindi, Marathi)
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Tamil: U+0B80-U+0BFF
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    // Telugu: U+0C00-U+0C7F
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Bengali: U+0980-U+09FF
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    // Gujarati: U+0A80-U+0AFF
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
    // Kannada: U+0C80-U+0CFF
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    // Malayalam: U+0D00-U+0D7F
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
    // Gurmukhi (Punjabi): U+0A00-U+0A7F
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
    // Odia: U+0B00-U+0B7F
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or';

    // Check for Romanized Hindi (common words)
    const hindiRomanized = /\b(kya|mera|paisa|kitna|bachat|kharch|kaise|yojana|sip|emi|loan|mujhe|bataao|chahiye|rupaye|paise)\b/i;
    if (hindiRomanized.test(text)) return 'hi';

    return 'en';
}

// ─── Translate to English ────────────────────────────────────────
export async function translateToEnglish(text: string, sourceLang: string): Promise<string> {
    if (sourceLang === 'en') return text;

    const langName = SUPPORTED_LANGUAGES[sourceLang] || 'Hindi';

    try {
        const systemPrompt = `You are a translator. Translate the following ${langName} text to English. 
RULES:
- Output ONLY the English translation, nothing else.
- Keep financial terms (SIP, EMI, UPI, PPF, NPS, CIBIL) as-is.
- Keep ₹ amounts as-is.
- Preserve the intent and emotion of the original message.
- If the text is already partially in English, translate only the non-English parts.`;

        const response = await chatWithOllama(systemPrompt, [
            { role: 'user', content: text },
        ]);

        return response.trim();
    } catch (error) {
        console.error('[Translation] Error translating to English:', error);
        return text; // fallback to original
    }
}

// ─── Translate from English ──────────────────────────────────────
export async function translateFromEnglish(text: string, targetLang: string): Promise<string> {
    if (targetLang === 'en') return text;

    const langName = SUPPORTED_LANGUAGES[targetLang] || 'Hindi';

    try {
        const systemPrompt = `You are a translator. Translate the following English text to ${langName}.
RULES:
- Output ONLY the ${langName} translation, nothing else.
- Keep financial terms (SIP, EMI, UPI, PPF, NPS, CIBIL) in English.
- Keep ₹ amounts in digits (₹5000, not पांच हज़ार रुपये).
- Use simple, conversational ${langName}. Avoid overly formal or Sanskritized vocabulary.
- Keep emoji as-is.
- Preserve markdown formatting (bullet points, bold text).`;

        const response = await chatWithOllama(systemPrompt, [
            { role: 'user', content: text },
        ]);

        return response.trim();
    } catch (error) {
        console.error('[Translation] Error translating from English:', error);
        return text; // fallback to original
    }
}

// ─── Full Translation Pipeline ───────────────────────────────────
// Wraps around the chat flow:
// 1. Detect language of user input
// 2. Translate to English for LLM processing
// 3. After LLM responds, translate back to user's language
export interface TranslationContext {
    originalLang: string;
    translatedInput: string;
    needsTranslation: boolean;
}

export async function preProcessMessage(message: string, userLanguage?: string): Promise<TranslationContext> {
    const detectedLang = userLanguage || detectLanguage(message);
    const needsTranslation = detectedLang !== 'en';

    return {
        originalLang: detectedLang,
        translatedInput: needsTranslation ? await translateToEnglish(message, detectedLang) : message,
        needsTranslation,
    };
}

export async function postProcessResponse(response: string, targetLang: string): Promise<string> {
    if (targetLang === 'en') return response;
    return translateFromEnglish(response, targetLang);
}
