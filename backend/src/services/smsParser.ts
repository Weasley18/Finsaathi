// ─── SMS Parser Service ────────────────────────────────────────
// Parses Indian bank / UPI SMS messages into structured transactions.
//
// Approach (deliberately conservative — a wrong transaction is worse than
// a skipped one):
//   1. Reject anything that is not a completed transaction (OTPs, promos,
//      bill reminders, failed/declined/requested payments).
//   2. Decide direction from the FIRST debit/credit keyword in the message
//      ("A/c debited ...; MERCHANT credited" is a debit).
//   3. Extract amount, date, merchant, account and balance.
//   4. Categorise with the shared categorizer so SMS imports use the same
//      category names as budgets and the ML service.
// Messages the rules cannot parse are handed to the Ollama fallback.

import { chatWithOllama } from './ollama.js';
import { categorizeTransaction, CATEGORIES, Category } from './categorizer.js';

export interface ParsedTransaction {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    merchant: string;
    category: string;
    date: Date;
    accountHint: string;    // e.g. "XX1234"
    balance?: number;
    confidence: number;     // 0-1
    source: 'SMS' | 'UPI';
    rawText: string;
}

// ─── Non-transaction filters ────────────────────────────────────
const OTP_PATTERN = /\b(otp|one[\s-]*time\s*password|verification\s*code|do\s*not\s*share)\b/i;
const PROMO_PATTERN = /\b(cashback|offer|congrat|win\b|winner|reward|voucher|coupon|apply\s*now|pre-?approved|limited\s*period)\b/i;
const NOT_COMPLETED_PATTERN = /\b(is\s*due|due\s*on|due\s*date|overdue|pay\s*now|will\s*be\s*(?:debited|deducted|credited)|to\s*be\s*(?:debited|deducted)|scheduled|requested|request\s*(?:from|of|for)|collect\s*request|declined|failed|unsuccessful|not\s*processed|reversed\s*due|insufficient)\b/i;

// ─── Direction keywords ─────────────────────────────────────────
const DEBIT_WORDS = /\b(debited|debit\s+(?:by|of|for)|withdrawn|spent|paid|sent|purchase|deducted)\b/i;
const CREDIT_WORDS = /\b(credited|credit\s+(?:by|of|for)|has\s+a\s+credit|received|deposited|refund(?:ed)?)\b/i;

// ─── Field patterns ─────────────────────────────────────────────
const CURRENCY_AMOUNT = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
// SBI UPI style: "debited by 250.00" (no currency marker)
const BARE_AMOUNT = /\b(?:debited|credited|debit|credit)\s+(?:by|for|with|of)\s+([\d,]+\.\d{2})\b/i;
const BALANCE_PATTERN = /(?:Avl\.?\s*Bal(?:ance)?|Available\s*Bal(?:ance)?|Bal(?:ance)?)\s*(?:is|:|-)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const ACCOUNT_PATTERN = /(?:A\/c|Acct?|Account|AC|Card)\s*(?:no\.?\s*)?(?:ending\s*)?[xX*.\s]*(\d{3,6})\b/i;
const VPA_PATTERN = /\b([a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,})\b/;

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function toNumber(raw: string): number {
    return parseFloat(raw.replace(/,/g, ''));
}

// Dates are built at 12:00 UTC so the calendar day never shifts with the
// server's time zone.
function makeDate(year: number, monthIndex: number, day: number): Date | null {
    if (year < 100) year += 2000;
    if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
    if (isNaN(d.getTime()) || d.getUTCDate() !== day) return null;
    // Bank SMS never describe the far future or the distant past
    const now = Date.now();
    if (d.getTime() > now + 2 * 86400000 || d.getUTCFullYear() < 2000) return null;
    return d;
}

function extractDate(text: string): Date {
    let m: RegExpMatchArray | null;

    // ISO: 2024-11-12
    if ((m = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/))) {
        const d = makeDate(+m[1], +m[2] - 1, +m[3]);
        if (d) return d;
    }
    // 12Nov24, 12-Nov-24, 12 Nov 2024, 01-NOV-24
    if ((m = text.match(/\b(\d{1,2})[\s\-\/]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]?(\d{4}|\d{2})\b/i))) {
        const d = makeDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
        if (d) return d;
    }
    // Indian numeric format: DD-MM-YY, DD/MM/YYYY
    if ((m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}|\d{2})\b/))) {
        const d = makeDate(+m[3], +m[2] - 1, +m[1]);
        if (d) return d;
    }
    return new Date();
}

function extractAccount(text: string): string {
    const match = text.match(ACCOUNT_PATTERN);
    return match ? `XX${match[1].slice(-4)}` : 'Unknown';
}

function extractBalance(text: string): number | undefined {
    const match = text.match(BALANCE_PATTERN);
    return match ? toNumber(match[1]) : undefined;
}

function extractAmount(text: string): { amount: number; hasCurrency: boolean } | null {
    // Remove the balance clause first so "Avl Bal Rs 8,500" is never the amount
    const withoutBalance = text.replace(BALANCE_PATTERN, ' ');
    const cur = withoutBalance.match(CURRENCY_AMOUNT);
    if (cur) return { amount: toNumber(cur[1]), hasCurrency: true };
    const bare = withoutBalance.match(BARE_AMOUNT);
    if (bare) return { amount: toNumber(bare[1]), hasCurrency: false };
    return null;
}

// ─── Merchant extraction ────────────────────────────────────────
const NAME = "([A-Za-z][A-Za-z0-9&'._\\- ]{1,40}?)";
const END = "(?=\\s+on\\b|\\s+ref\\b|\\s+refno\\b|\\s+upi\\b|\\s+via\\b|\\s+avl\\b|\\s+bal\\b|\\s+not\\b|\\s+if\\b|\\s+using\\b|\\s*[.;,\\n(]|\\s*-\\s*[A-Z]{2,}|\\s*$)";

const DEBIT_MERCHANT_PATTERNS: RegExp[] = [
    new RegExp(`\\b(?:trf|transfer(?:red)?)\\s+to\\s+${NAME}${END}`, 'i'),   // SBI: trf to SWIGGY Refno
    /UPI\/(?:P2M|P2A|P2P)\/\d+\/([A-Za-z][A-Za-z0-9&'._\- ]{1,40})/i,          // Axis: UPI/P2M/4317.../BIGBASKET
    new RegExp(`;\\s*${NAME}\\s+credited`, 'i'),                               // ICICI: ; FLIPKART credited
    new RegExp(`\\bat\\s+${NAME}${END}`, 'i'),                                 // card: At AMAZON PAY INDIA On
    new RegExp(`\\b(?:to|towards)\\s+(?:VPA\\s+)?${NAME}${END}`, 'i'),         // To ZOMATO LTD / paid to Chai Point
    new RegExp(`\\bfor\\s+${NAME}${END}`, 'i'),
];

const CREDIT_MERCHANT_PATTERNS: RegExp[] = [
    new RegExp(`\\b(?:NEFT|IMPS|RTGS)\\s*(?:Cr)?\\s*[-:/]?\\s*${NAME}${END}`, 'i'), // by NEFT ACME PVT LTD / NEFT Cr-ACME
    new RegExp(`\\bfrom\\s+(?:VPA\\s+)?${NAME}${END}`, 'i'),                        // received from X / refund from FLIPKART
    new RegExp(`\\bby\\s+${NAME}${END}`, 'i'),
];

// Words that show the capture is boilerplate, not a merchant name
const MERCHANT_STOPWORDS = /^(rs|inr|your|you|the|a\/c|ac|acct|account|bank|card|upi|ref|refno|call|sms|block|avoid|date|transfer|a|an|hdfc bank|axis bank|icici bank|kotak bank|sbi)$/i;

function cleanMerchant(raw: string | undefined): string | null {
    if (!raw) return null;
    const name = raw.replace(/\s+/g, ' ').trim().replace(/[.\-_,;]+$/, '').trim();
    if (name.length < 2) return null;
    if (MERCHANT_STOPWORDS.test(name)) return null;
    if (/^(?:a\/c|acct?|account|ac)\b/i.test(name)) return null;       // "A/c XX1234"
    if (/^(?:rs|inr)\b/i.test(name)) return null;                      // "Rs 500"
    if (/\d{5,}/.test(name)) return null;                              // phone / reference numbers
    if (/\b(?:hdfc|axis|icici|kotak|sbi|pnb)\s+bank\b.*\b(?:a\/c|ac|card)\b/i.test(name)) return null;
    return name.substring(0, 50);
}

function extractMerchant(text: string, type: 'INCOME' | 'EXPENSE'): string {
    if (/\batm\b/i.test(text) && /withdraw/i.test(text)) return 'ATM';

    // A UPI handle is the most reliable counterparty identifier
    const vpa = text.match(VPA_PATTERN);

    const patterns = type === 'EXPENSE' ? DEBIT_MERCHANT_PATTERNS : CREDIT_MERCHANT_PATTERNS;
    for (const pattern of patterns) {
        const candidate = cleanMerchant(text.match(pattern)?.[1]);
        if (candidate) return candidate;
    }
    return vpa ? vpa[1] : 'Unknown';
}

function pickCategory(text: string, merchant: string, type: 'INCOME' | 'EXPENSE'): Category {
    if (merchant === 'ATM') return 'Transfer';

    let category: Category = merchant !== 'Unknown' ? categorizeTransaction('', merchant) : 'Other';
    if (category === 'Other') category = categorizeTransaction(text);

    // Spending categories make no sense for money coming in, except refunds
    if (type === 'INCOME' && category !== 'Salary' && !/refund/i.test(text)) {
        return /\b(neft|imps|rtgs|transfer|upi)\b/i.test(text) ? 'Transfer' : 'Other';
    }
    if (type === 'EXPENSE' && category === 'Salary') return 'Other';
    return category;
}

// ─── Parse Single SMS ───────────────────────────────────────────
export function parseBankSMS(sms: string): ParsedTransaction | null {
    const text = sms.trim();
    if (text.length < 10) return null;

    // 1. Not a completed transaction
    if (OTP_PATTERN.test(text)) return null;
    if (NOT_COMPLETED_PATTERN.test(text)) return null;

    // 2. Direction — whichever keyword appears first wins
    const debit = text.match(DEBIT_WORDS);
    const credit = text.match(CREDIT_WORDS);
    if (!debit && !credit) return null;
    if (PROMO_PATTERN.test(text) && !/\b(a\/c|acct?|account|card|upi)\b/i.test(text)) return null;

    let type: 'INCOME' | 'EXPENSE';
    if (debit && credit) type = (debit.index ?? 0) <= (credit.index ?? 0) ? 'EXPENSE' : 'INCOME';
    else type = debit ? 'EXPENSE' : 'INCOME';

    // 3. Amount
    const amt = extractAmount(text);
    if (!amt || isNaN(amt.amount) || amt.amount <= 0) return null;

    const merchant = extractMerchant(text, type);
    const category = pickCategory(text, merchant, type);

    let confidence = 0.9;
    if (merchant === 'Unknown') confidence -= 0.15;
    if (!amt.hasCurrency) confidence -= 0.1;
    if (debit && credit) confidence -= 0.05;

    return {
        type,
        amount: amt.amount,
        description: text.replace(/\s+/g, ' ').substring(0, 200),
        merchant,
        category,
        date: extractDate(text),
        accountHint: extractAccount(text),
        balance: extractBalance(text),
        confidence: Math.round(confidence * 100) / 100,
        source: /\b(upi|gpay|phonepe|paytm|vpa)\b/i.test(text) || VPA_PATTERN.test(text) ? 'UPI' : 'SMS',
        rawText: text,
    };
}

// ─── Batch Parse ────────────────────────────────────────────────
export function batchParseSMS(messages: string[]): {
    parsed: ParsedTransaction[];
    failed: string[];
    stats: { total: number; success: number; failed: number; avgConfidence: number };
} {
    const parsed: ParsedTransaction[] = [];
    const failed: string[] = [];

    for (const msg of messages) {
        const result = parseBankSMS(msg);
        if (result) {
            parsed.push(result);
        } else {
            failed.push(msg);
        }
    }

    const avgConfidence = parsed.length > 0
        ? parsed.reduce((sum, p) => sum + p.confidence, 0) / parsed.length
        : 0;

    return {
        parsed,
        failed,
        stats: {
            total: messages.length,
            success: parsed.length,
            failed: failed.length,
            avgConfidence: Math.round(avgConfidence * 100) / 100,
        },
    };
}

// True for messages the rule-based parser rejected on purpose (OTPs, promos,
// reminders, failed payments). These must NOT be sent to the LLM fallback,
// otherwise it may invent a transaction from them.
export function isNonTransactionSMS(sms: string): boolean {
    const text = sms.trim();
    return text.length < 10 || OTP_PATTERN.test(text) || NOT_COMPLETED_PATTERN.test(text)
        || (!DEBIT_WORDS.test(text) && !CREDIT_WORDS.test(text));
}

// ─── Ollama NLP Fallback for Failed Parses ──────────────────────
export async function nlpParseSMS(messages: string[]): Promise<ParsedTransaction[]> {
    const batch = messages.filter(m => !isNonTransactionSMS(m)).slice(0, 10); // max 10 at a time
    if (batch.length === 0) return [];

    const systemPrompt = `You are a financial transaction extractor for Indian bank SMS messages.
Parse each SMS and extract transaction details.

Return ONLY a valid JSON array with exactly one entry per SMS, in order (no markdown, no code blocks):
[
  {
    "type": "INCOME" or "EXPENSE",
    "amount": number,
    "merchant": "merchant/sender name",
    "category": "category string",
    "description": "brief description"
  }
]

For messages that are not completed transactions (OTPs, promos, reminders, failed payments), return null for that entry.
Categories (use exactly one of these): ${CATEGORIES.join(', ')}`;

    const userMsg = batch.map((msg, i) => `SMS ${i + 1}: "${msg}"`).join('\n');

    try {
        const response = await chatWithOllama(systemPrompt, [
            { role: 'user', content: userMsg }
        ]);

        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed)) {
            const results: ParsedTransaction[] = [];
            for (let i = 0; i < Math.min(parsed.length, batch.length); i++) {
                const p = parsed[i];
                const amount = Number(p?.amount);
                if (!p || !Number.isFinite(amount) || amount <= 0) continue;
                const merchant = typeof p.merchant === 'string' && p.merchant.trim() ? p.merchant.trim().substring(0, 50) : 'Unknown';
                // Never trust a free-text category from the model — snap to the canonical list
                const category: Category = (CATEGORIES as readonly string[]).includes(p.category)
                    ? p.category
                    : categorizeTransaction(`${p.description || ''} ${batch[i]}`, merchant);
                results.push({
                    type: p.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
                    amount,
                    description: (p.description || batch[i]).substring(0, 200),
                    merchant,
                    category,
                    date: extractDate(batch[i]),
                    accountHint: extractAccount(batch[i]),
                    balance: extractBalance(batch[i]),
                    confidence: 0.6,
                    source: 'SMS' as const,
                    rawText: batch[i],
                });
            }
            return results;
        }
    } catch (e) {
        console.error('[SMSParser] NLP fallback failed:', e);
    }

    return [];
}
