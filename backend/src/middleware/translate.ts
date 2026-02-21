import { FastifyRequest, FastifyReply } from 'fastify';
import { translateFromEnglish, SUPPORTED_LANGUAGES } from '../services/translation.js';

// ─── Response Translation Middleware ─────────────────────────────
// Translates specific string fields in API responses to the user's
// preferred language (from JWT). Attach to routes that return
// user-facing text (insights, notifications, lessons, categories).

interface TranslatableConfig {
    /** JSON paths to string fields that should be translated */
    fields: string[];
}

/**
 * Creates a Fastify onSend hook that translates response fields.
 * Usage:
 *   app.addHook('onSend', createTranslationHook({ fields: ['title', 'description'] }));
 */
export function createTranslationHook(config: TranslatableConfig) {
    return async function translateResponse(
        request: FastifyRequest & { user?: any },
        reply: FastifyReply,
        payload: string
    ): Promise<string> {
        const lang = (request as any).user?.language;

        // Skip if no auth, English, or unsupported language
        if (!lang || lang === 'en' || !SUPPORTED_LANGUAGES[lang]) {
            return payload;
        }

        // Only translate JSON responses
        const contentType = reply.getHeader('content-type');
        if (!contentType || !String(contentType).includes('application/json')) {
            return payload;
        }

        try {
            const data = JSON.parse(payload);
            const translated = await translateObjectFields(data, config.fields, lang);
            return JSON.stringify(translated);
        } catch {
            return payload;
        }
    };
}

/**
 * Recursively translates specified fields in an object/array.
 */
async function translateObjectFields(
    obj: any,
    fields: string[],
    targetLang: string
): Promise<any> {
    if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => translateObjectFields(item, fields, targetLang)));
    }

    if (obj && typeof obj === 'object') {
        const entries = Object.entries(obj);
        const result: Record<string, any> = {};

        for (const [key, value] of entries) {
            if (fields.includes(key) && typeof value === 'string' && value.length > 0) {
                result[key] = await translateFromEnglish(value, targetLang);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = await translateObjectFields(value, fields, targetLang);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    return obj;
}

/**
 * Utility: Get user's language from request (JWT or query param or header).
 */
export function getUserLanguage(request: FastifyRequest & { user?: any }): string {
    return (
        (request as any).user?.language ||
        (request.headers['x-user-language'] as string) ||
        (request.headers['accept-language']?.split(',')[0]?.split('-')[0]) ||
        'en'
    );
}
