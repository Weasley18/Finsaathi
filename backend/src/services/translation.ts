import { createHash } from 'crypto';
import { chatWithOllama } from './ollama';

// ─── Multilingual Translation Service ────────────────────────────
// Uses IndicTrans2 (AI4Bharat) via Hugging Face Inference API for
// high-quality Indic language translation. Supports 12 languages.

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HF_INDIC_TO_EN = 'https://api-inference.huggingface.co/models/ai4bharat/indictrans2-indic-en-1B';
const HF_EN_TO_INDIC = 'https://api-inference.huggingface.co/models/ai4bharat/indictrans2-en-indic-1B';

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

// IndicTrans2 uses BCP-47 / Flores-200 language codes
const LANG_CODE_MAP: Record<string, string> = {
    en: 'eng_Latn',
    hi: 'hin_Deva',
    ta: 'tam_Taml',
    te: 'tel_Telu',
    bn: 'ben_Beng',
    mr: 'mar_Deva',
    gu: 'guj_Gujr',
    kn: 'kan_Knda',
    ml: 'mal_Mlym',
    pa: 'pan_Guru',
    or: 'ory_Orya',
    as: 'asm_Beng',
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
    // Bengali/Assamese: U+0980-U+09FF
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

// ─── IndicTrans2 HuggingFace API Call ────────────────────────────
async function callIndicTrans2(
    text: string,
    sourceLang: string,
    targetLang: string,
    apiUrl: string
): Promise<string> {
    const srcCode = LANG_CODE_MAP[sourceLang];
    const tgtCode = LANG_CODE_MAP[targetLang];

    if (!srcCode || !tgtCode) {
        console.warn(`[Translation] Unsupported lang pair: ${sourceLang} → ${targetLang}`);
        return text;
    }

    const payload = {
        inputs: text,
        parameters: {
            src_lang: srcCode,
            tgt_lang: tgtCode,
        },
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HF API error ${response.status}: ${errBody}`);
    }

    const result = await response.json();

    // HuggingFace returns [{ translation_text: "..." }] or [{ generated_text: "..." }]
    if (Array.isArray(result) && result.length > 0) {
        return result[0].translation_text || result[0].generated_text || text;
    }

    return text;
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
        const translated = await callIndicTrans2(text, sourceLang, 'en', HF_INDIC_TO_EN);
        await setCachedTranslation(cacheKey, translated);
        console.log(`[Translation] IndicTrans2: ${sourceLang} → en`);
        return translated;
    } catch (error) {
        console.error('[Translation] Error translating to English:', error);
        return text; // fallback to original
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
        const translated = await callIndicTrans2(text, 'en', targetLang, HF_EN_TO_INDIC);
        await setCachedTranslation(cacheKey, translated);
        console.log(`[Translation] IndicTrans2: en → ${targetLang}`);
        return translated;
    } catch (error) {
        console.error('[Translation] Error translating from English:', error);
        return text; // fallback to original
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
