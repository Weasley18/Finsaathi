import { createHash } from 'crypto';
import { chatWithOllama } from './ollama';

// ─── Multilingual Translation Service ────────────────────────────
// Uses Helsinki-NLP opus-mt multilingual models via HuggingFace Inference API.
// Falls back to Ollama LLM translation if HF is unavailable.

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HF_MUL_TO_EN = 'https://router.huggingface.co/hf-inference/models/Helsinki-NLP/opus-mt-mul-en';
const HF_EN_TO_MUL = 'https://router.huggingface.co/hf-inference/models/Helsinki-NLP/opus-mt-en-mul';

// ─── Redis-based Translation Cache ──────────────────────────────
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const CACHE_TTL = 86400; // 24 hours

async function getCachedTranslation(key: string): Promise<string | null> {
    try {
        return await redis.get(key);
    } catch {
        return null;
    }
}

async function setCachedTranslation(key: string, value: string): Promise<void> {
    try {
        await redis.set(key, value, 'EX', CACHE_TTL);
    } catch (err) {
        console.error('[Translation Cache] Failed to set:', err);
    }
}

function translationCacheKey(sourceLang: string, targetLang: string, text: string): string {
    const hash = createHash('sha256').update(text).digest('hex').substring(0, 16);
    return `trans:${sourceLang}:${targetLang}:${hash}`;
}

// ─── Supported Languages ────────────────────────────────────────
export const SUPPORTED_LANGUAGES: Record<string, string> = {
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
    as: 'Assamese',
};

// Helsinki-NLP opus-mt uses ISO 639-3 language codes with >>code<< prefix
const LANG_CODE_MAP: Record<string, string> = {
    en: 'eng',
    hi: 'hin',
    ta: 'tam',
    te: 'tel',
    bn: 'ben',
    mr: 'mar',
    gu: 'guj',
    kn: 'kan',
    ml: 'mal',
    pa: 'pan',
    or: 'ori',
    as: 'asm',
};

// ─── Helsinki-NLP opus-mt HuggingFace API Call ───────────────────
async function callOpusMT(
    text: string,
    sourceLang: string,
    targetLang: string,
): Promise<string> {
    const srcCode = LANG_CODE_MAP[sourceLang];
    const tgtCode = LANG_CODE_MAP[targetLang];

    if (!srcCode || !tgtCode) {
        console.warn(`[Translation] Unsupported lang pair: ${sourceLang} → ${targetLang}`);
        return text;
    }

    // Determine direction and prepend language tag
    let apiUrl: string;
    let input: string;

    if (targetLang === 'en') {
        // Indic → English: use mul-en model with source language tag
        apiUrl = HF_MUL_TO_EN;
        input = `>>${srcCode}<< ${text}`;
    } else {
        // English → Indic: use en-mul model with target language tag
        apiUrl = HF_EN_TO_MUL;
        input = `>>${tgtCode}<< ${text}`;
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: input }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HF API error ${response.status}: ${errBody}`);
    }

    const result = await response.json();

    // HuggingFace returns [{ translation_text: "..." }]
    if (Array.isArray(result) && result.length > 0) {
        return result[0].translation_text || result[0].generated_text || text;
    }

    return text;
}

// ─── Ollama Fallback Translation ─────────────────────────────────
async function translateWithOllama(text: string, fromLang: string, toLang: string): Promise<string> {
    const fromName = SUPPORTED_LANGUAGES[fromLang] || fromLang;
    const toName = SUPPORTED_LANGUAGES[toLang] || toLang;
    const systemPrompt = 'You are a professional translator. Respond with ONLY the translated text, nothing else. No explanations.';
    const messages = [{ role: 'user', content: `Translate from ${fromName} to ${toName}:\n\n${text}` }];
    const result = await chatWithOllama(systemPrompt, messages);
    return result.trim();
}

// ─── Translate to English ────────────────────────────────────────
export async function translateToEnglish(text: string, sourceLang: string): Promise<string> {
    if (sourceLang === 'en') return text;

    // Check cache
    const cacheKey = translationCacheKey(sourceLang, 'en', text);
    const cached = await getCachedTranslation(cacheKey);
    if (cached) {
        console.log(`[Translation] Cache hit: ${sourceLang} → en`);
        return cached;
    }

    try {
        if (HF_API_KEY) {
            const translated = await callOpusMT(text, sourceLang, 'en');
            await setCachedTranslation(cacheKey, translated);
            console.log(`[Translation] opus-mt: ${sourceLang} → en`);
            return translated;
        }
        throw new Error('No HF API key, falling back to Ollama');
    } catch (error) {
        console.warn('[Translation] HF failed, trying Ollama fallback:', (error as Error).message);
        try {
            const translated = await translateWithOllama(text, sourceLang, 'en');
            await setCachedTranslation(cacheKey, translated);
            console.log(`[Translation] Ollama fallback: ${sourceLang} → en`);
            return translated;
        } catch (ollamaErr) {
            console.error('[Translation] All methods failed:', ollamaErr);
            return text;
        }
    }
}

// ─── Translate from English ──────────────────────────────────────
export async function translateFromEnglish(text: string, targetLang: string): Promise<string> {
    if (targetLang === 'en') return text;

    // Check cache
    const cacheKey = translationCacheKey('en', targetLang, text);
    const cached = await getCachedTranslation(cacheKey);
    if (cached) {
        console.log(`[Translation] Cache hit: en → ${targetLang}`);
        return cached;
    }

    try {
        if (HF_API_KEY) {
            const translated = await callOpusMT(text, 'en', targetLang);
            await setCachedTranslation(cacheKey, translated);
            console.log(`[Translation] opus-mt: en → ${targetLang}`);
            return translated;
        }
        throw new Error('No HF API key, falling back to Ollama');
    } catch (error) {
        console.warn('[Translation] HF failed, trying Ollama fallback:', (error as Error).message);
        try {
            const translated = await translateWithOllama(text, 'en', targetLang);
            await setCachedTranslation(cacheKey, translated);
            console.log(`[Translation] Ollama fallback: en → ${targetLang}`);
            return translated;
        } catch (ollamaErr) {
            console.error('[Translation] All methods failed:', ollamaErr);
            return text;
        }
    }
}

// ─── Translate arbitrary text (for middleware use) ───────────────
export async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    if (fromLang === toLang) return text;
    if (toLang === 'en') return translateToEnglish(text, fromLang);
    if (fromLang === 'en') return translateFromEnglish(text, toLang);
    // For non-English pair, pivot through English
    const english = await translateToEnglish(text, fromLang);
    return translateFromEnglish(english, toLang);
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
    const detectedLang = userLanguage || 'en';
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
