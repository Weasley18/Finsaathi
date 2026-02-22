// ─── SMS Parser Service ────────────────────────────────────────
// Parses Indian bank SMS messages into structured transaction data.
// Uses a combination of regex templates and Ollama NLP fallback.

import { chatWithOllama } from './ollama.js';

export interface ParsedTransaction {
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
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

// ─── Indian Bank SMS Templates ──────────────────────────────────
const DEBIT_PATTERNS = [
    // SBI
    /(?:debited|withdrawn)\s+(?:by\s+)?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:from\s+)?(?:A\/c|a\/c|Acct?)\s*(?:No\.?\s*)?(?:\*{0,})?(\w{4,})/i,
    // HDFC
    /Rs\.?\s*([\d,]+\.?\d*)\s+(?:has been\s+)?debited\s+(?:from\s+)?(?:A\/c|a\/c)\s*(?:\*{0,})?(\w{4,})/i,
    // ICICI
    /(?:Acct|Account)\s*(?:\*{0,})?(\w{4,})\s+(?:is\s+)?debited\s+(?:with\s+)?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
    // Axis
    /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+(?:debited|spent)\s+(?:from\s+)?(?:Axis\s+)?(?:A\/c|a\/c)\s*(?:\*{0,})?(\w{4,})/i,
    // Kotak
    /Amt\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+debited.*?(?:A\/c|a\/c)\s*(?:\*{0,})?(\w{4,})/i,
    // PNB
    /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+has\s+been\s+(?:debited|deducted)\s+from\s+(?:your\s+)?(?:a\/c|account)\s*(\w{4,})/i,
    // BOB / Canara / Union Bank
    /(?:debited|deducted).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+.*?(?:a\/c|A\/c)\s*(\w{4,})/i,
    // Generic debit
    /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:debited|withdrawn|spent|paid)/i,
];

const CREDIT_PATTERNS = [
    // SBI
    /(?:credited|received|deposited)\s+(?:by\s+)?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:to\s+)?(?:A\/c|a\/c|Acct?)\s*(?:\*{0,})?(\w{4,})/i,
    // HDFC
    /Rs\.?\s*([\d,]+\.?\d*)\s+(?:has been\s+)?credited\s+(?:to\s+)?(?:A\/c|a\/c)\s*(?:\*{0,})?(\w{4,})/i,
    // ICICI
    /(?:Acct|Account)\s*(?:\*{0,})?(\w{4,})\s+(?:is\s+)?credited\s+(?:with\s+)?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
    // Generic credit
    /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:credited|received|deposited)/i,
    // Salary / NEFT / IMPS
    /(?:NEFT|IMPS|UPI|salary|credit).*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:credited|received)/i,
];

const UPI_PATTERNS = [
    // Google Pay / PhonePe / Paytm
    /(?:paid|sent)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+to\s+(.+?)(?:\s+on|\s+via|\s+UPI|\.|$)/i,
    /(?:received|got)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+from\s+(.+?)(?:\s+on|\s+via|\s+UPI|\.|$)/i,
    // UPI transaction
    /UPI.*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+(?:debited|credited|paid|received)/i,
    // VPA
    /(?:VPA|UPI\s*ID)\s*[:\-]?\s*([a-zA-Z0-9._]+@[a-zA-Z]+)/i,
];

const BALANCE_PATTERN = /(?:Bal|Balance|Avl\s*Bal|Available\s*Bal)[:\s]*(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)/i;
const ACCOUNT_PATTERN = /(?:A\/c|a\/c|Acct?|Account)\s*(?:No\.?\s*)?(?:\*{0,})?[xX*]*(\d{4})/i;
const MERCHANT_PATTERN = /(?:at|to|@|towards|for|via)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\s+UPI|\.|\s+Avl|$)/i;
const DATE_PATTERN = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/;

// ─── Amount Extractor Helper ────────────────────────────────────
function extractAmount(text: string): number | null {
    const match = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
    return null;
}

function extractAccount(text: string): string {
    const match = text.match(ACCOUNT_PATTERN);
    return match ? `XX${match[1]}` : 'Unknown';
}

function extractBalance(text: string): number | undefined {
    const match = text.match(BALANCE_PATTERN);
    return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
}

function extractDate(text: string): Date {
    const match = text.match(DATE_PATTERN);
    if (match) {
        const raw = match[1];
        const parts = raw.split(/[\/-]/);
        if (parts.length === 3) {
            let [a, b, c] = parts.map(Number);
            // Indian SMS format: DD-MM-YY or DD/MM/YY or DD-MM-YYYY
            if (c < 100) c += 2000; // 25 → 2025
            // a=day, b=month, c=year (Indian format DD-MM-YY)
            if (a > 12) {
                // a must be day (>12), b is month
                const d = new Date(c, b - 1, a);
                if (!isNaN(d.getTime())) return d;
            }
            // b > 12 means b is day, a is month (MM-DD-YY, unlikely for Indian SMS)
            if (b > 12) {
                const d = new Date(c, a - 1, b);
                if (!isNaN(d.getTime())) return d;
            }
            // Ambiguous (both ≤12): assume DD-MM-YY (Indian default)
            const d = new Date(c, b - 1, a);
            if (!isNaN(d.getTime())) return d;
        }
        // Fallback
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
}

function extractMerchant(text: string): string {
    const match = text.match(MERCHANT_PATTERN);
    if (match) return match[1].trim().substring(0, 50);

    // Try VPA extraction
    const vpa = text.match(/([a-zA-Z0-9._]+@[a-zA-Z]+)/);
    if (vpa) return vpa[1];

    return 'Unknown';
}

// ─── Quick Category Guesser ─────────────────────────────────────
const QUICK_CATEGORIES: Array<[RegExp, string]> = [
    [/swiggy|zomato|food|restaurant|cafe|hotel|biryani|pizza|domino|mcdonald|kfc|chai/i, 'Food & Dining'],
    [/uber|ola|metro|bus|irctc|railway|flight|redbus|makemytrip|goibibo|auto|petrol|diesel|fuel|iocl|bpcl|hp/i, 'Transport'],
    [/amazon|flipkart|myntra|ajio|meesho|tatacliq|snapdeal|shopclues/i, 'Shopping'],
    [/netflix|hotstar|spotify|prime|youtube|gaana|jiocinema/i, 'Entertainment'],
    [/airtel|jio|vi|vodafone|bsnl|broadband|wifi|internet|recharge/i, 'Telecom & Internet'],
    [/electricity|electric|power|bescom|msedcl|gas|water|piped/i, 'Utilities'],
    [/rent|landlord|society|maintenance|flat/i, 'Rent'],
    [/hospital|doctor|pharmacy|medical|apollo|medplus|1mg|pharmeasy|lenskart|optical/i, 'Healthcare'],
    [/school|college|university|tuition|coaching|udemy|coursera|byju|unacademy|education|exam/i, 'Education'],
    [/insurance|lic|hdfc\s*life|sbi\s*life|icici\s*pru|policy/i, 'Insurance'],
    [/mutual\s*fund|sip|groww|zerodha|upstox|kuvera|coin|mf|etf|share|stock|demat/i, 'Investment'],
    [/emi|loan|interest|bajaj\s*finserv|home\s*credit|lendingkart/i, 'EMI & Loans'],
    [/salary|income|neft.*?salary/i, 'Salary'],
    [/\bcred\b|credit\s*card|bill\s*pay/i, 'Bill Payments'],
    [/atm|cash\s*withdrawal|neft|imps|transfer/i, 'Transfer'],
    [/gpay|phonepe|paytm/i, 'UPI Payment'],
    [/bigbasket|blinkit|instamart|zepto|grofers|dmart|spencer|reliance\s*fresh|grocery|kirana/i, 'Groceries'],
    [/gold|tanishq|kalyan|malabar|jewel/i, 'Gold & Jewelry'],
    [/donation|temple|charity|ngo/i, 'Donations'],
    [/slice|fi\s*money|jupiter|niyo|razorpay/i, 'Fintech'],
];

function quickCategory(text: string): string {
    for (const [pattern, category] of QUICK_CATEGORIES) {
        if (pattern.test(text)) return category;
    }
    return 'Other';
}

// ─── Parse Single SMS ───────────────────────────────────────────
export function parseBankSMS(sms: string): ParsedTransaction | null {
    const text = sms.trim();
    if (text.length < 10) return null;

    // Skip OTPs, promotions, empty messages
    if (/otp|code|password|verify|promo|offer|cashback|congrat|win|dear\s+customer.*?important/i.test(text) && !/debited|credited|paid|received|withdrawn/i.test(text)) {
        return null;
    }

    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';
    let amount: number | null = null;
    let confidence = 0.8;

    // Try debit patterns
    for (const pattern of DEBIT_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            type = 'EXPENSE';
            // Amount may be in group 1 or 2 depending on pattern
            const amtStr = match[1].replace(/,/g, '');
            amount = parseFloat(amtStr);
            if (isNaN(amount) && match[2]) {
                amount = parseFloat(match[2].replace(/,/g, ''));
            }
            confidence = 0.9;
            break;
        }
    }

    // Try credit patterns
    if (!amount) {
        for (const pattern of CREDIT_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                type = 'INCOME';
                const amtStr = match[1].replace(/,/g, '');
                amount = parseFloat(amtStr);
                if (isNaN(amount) && match[2]) {
                    amount = parseFloat(match[2].replace(/,/g, ''));
                }
                confidence = 0.9;
                break;
            }
        }
    }

    // Try UPI patterns
    if (!amount) {
        for (const pattern of UPI_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                const amtStr = match[1]?.replace(/,/g, '');
                if (amtStr) amount = parseFloat(amtStr);
                if (/paid|sent|debited/i.test(text)) type = 'EXPENSE';
                else if (/received|credited/i.test(text)) type = 'INCOME';
                else type = 'TRANSFER';
                confidence = 0.85;
                break;
            }
        }
    }

    // Generic amount fallback
    if (!amount) {
        amount = extractAmount(text);
        confidence = 0.5;  // low confidence
    }

    if (!amount || isNaN(amount) || amount <= 0) return null;

    const merchant = extractMerchant(text);
    const category = quickCategory(text + ' ' + merchant);

    return {
        type,
        amount,
        description: text.substring(0, 200),
        merchant,
        category,
        date: extractDate(text),
        accountHint: extractAccount(text),
        balance: extractBalance(text),
        confidence,
        source: /upi|gpay|phonepe|paytm/i.test(text) ? 'UPI' : 'SMS',
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

// ─── Ollama NLP Fallback for Failed Parses ──────────────────────
export async function nlpParseSMS(messages: string[]): Promise<ParsedTransaction[]> {
    if (messages.length === 0) return [];

    const batch = messages.slice(0, 10); // Process max 10 at a time

    const systemPrompt = `You are a financial transaction extractor for Indian bank SMS messages.
Parse each SMS and extract transaction details.

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "type": "INCOME" or "EXPENSE" or "TRANSFER",
    "amount": number,
    "merchant": "merchant/sender name",
    "category": "category string",
    "description": "brief description"
  }
]

For messages that are not transactions (OTPs, promos), return null for that entry.
Categories: Food & Dining, Transport, Shopping, Entertainment, Telecom, Utilities, Rent, Healthcare, Education, Insurance, Investment, EMI & Loans, Bill Payments, Transfer, Salary, UPI Payment, Groceries, Other`;

    const userMsg = batch.map((msg, i) => `SMS ${i + 1}: "${msg}"`).join('\n');

    try {
        const response = await chatWithOllama(systemPrompt, [
            { role: 'user', content: userMsg }
        ]);

        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed)) {
            const results: ParsedTransaction[] = [];
            for (let i = 0; i < parsed.length; i++) {
                const p = parsed[i];
                if (!p || !p.amount) continue;
                results.push({
                    type: p.type || 'EXPENSE',
                    amount: p.amount,
                    description: p.description || batch[i]?.substring(0, 200) || '',
                    merchant: p.merchant || 'Unknown',
                    category: p.category || 'Other',
                    date: new Date(),
                    accountHint: extractAccount(batch[i] || ''),
                    confidence: 0.6,
                    source: 'SMS' as const,
                    rawText: batch[i] || '',
                });
            }
            return results;
        }
    } catch (e) {
        console.error('[SMSParser] NLP fallback failed:', e);
    }

    return [];
}
