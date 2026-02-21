// ─── Auto-Categorization Service ─────────────────────────────────
// Rule-based classifier for Indian transaction descriptions.
// Maps transaction descriptions/merchants to 23 Indian-context categories.

export const CATEGORIES = [
    'Food', 'Groceries', 'Transport', 'Autorickshaw', 'Fuel',
    'Shopping', 'Clothing', 'Electronics', 'EMI', 'Rent',
    'Utilities', 'Mobile Recharge', 'Entertainment', 'Health',
    'Education', 'Festival', 'Pooja', 'Insurance', 'Investment',
    'Subscription', 'Personal Care', 'Gifts', 'Other',
] as const;

export type Category = typeof CATEGORIES[number];

// ─── Category Rules ──────────────────────────────────────────────
// Each rule has keywords that match against description + merchant.
// Priority: first match wins. More specific rules go first.
const CATEGORY_RULES: Array<{ category: Category; keywords: RegExp }> = [
    // EMI / Loans (check first — very specific)
    { category: 'EMI', keywords: /\b(emi|loan|repayment|instalment|installment|bajaj\s*fin|hdfc\s*ltd|home\s*credit)\b/i },

    // Rent
    { category: 'Rent', keywords: /\b(rent|landlord|house\s*rent|pg\s*charges|hostel|nobroker|nestaway)\b/i },

    // Insurance
    { category: 'Insurance', keywords: /\b(insurance|premium|lic|policy|health\s*cover|term\s*plan|star\s*health|icici\s*pru)\b/i },

    // Investment
    { category: 'Investment', keywords: /\b(sip|mutual\s*fund|invest|zerodha|groww|kuvera|paytm\s*money|gold|ppf|nps|fd|fixed\s*deposit)\b/i },

    // Subscription
    { category: 'Subscription', keywords: /\b(netflix|hotstar|spotify|prime|youtube\s*premium|jio\s*cinema|subscription|ott)\b/i },

    // Mobile Recharge
    { category: 'Mobile Recharge', keywords: /\b(recharge|airtel|jio|vi\s|vodafone|bsnl|mobile\s*plan|prepaid|postpaid)\b/i },

    // Utilities
    { category: 'Utilities', keywords: /\b(electricity|electric|water\s*bill|gas\s*bill|utility|bescom|tata\s*power|piped\s*gas|broadband|wifi|internet\s*bill)\b/i },

    // Education
    { category: 'Education', keywords: /\b(school|college|tuition|coaching|course|udemy|coursera|exam\s*fee|books|stationery|unacademy|byju)\b/i },

    // Health / Medical
    { category: 'Health', keywords: /\b(hospital|doctor|clinic|medical|pharmacy|medicine|apollo|medplus|pharmeasy|1mg|netmeds|diagnostic|lab\s*test|dental)\b/i },

    // Autorickshaw / cab
    { category: 'Autorickshaw', keywords: /\b(auto|rickshaw|ola|uber|rapido|namma\s*yatri|cab|taxi|indriver)\b/i },

    // Fuel
    { category: 'Fuel', keywords: /\b(petrol|diesel|fuel|hp\s*pump|ioc|bpcl|filling\s*station|ev\s*charge|cng)\b/i },

    // Transport (bus, metro, train)
    { category: 'Transport', keywords: /\b(bus|metro|train|irctc|railway|bmtc|ksrtc|redbus|uber\s*moto|bike\s*taxi|toll|fastag)\b/i },

    // Festival / Religious
    { category: 'Festival', keywords: /\b(festival|diwali|holi|eid|christmas|pongal|onam|rakhi|navratri|durga\s*puja|ganesh)\b/i },
    { category: 'Pooja', keywords: /\b(pooja|puja|temple|mandir|gurudwara|mosque|church|donation|dakshina|prasad|havan)\b/i },

    // Entertainment
    { category: 'Entertainment', keywords: /\b(movie|cinema|pvr|inox|game|gaming|concert|event|park|zoo|museum|bowling|pub|bar|club)\b/i },

    // Personal Care
    { category: 'Personal Care', keywords: /\b(salon|haircut|spa|parlour|parlor|grooming|urban\s*company|beauty|cosmetic|makeup)\b/i },

    // Clothing
    { category: 'Clothing', keywords: /\b(cloth|apparel|fashion|myntra|ajio|zara|h&m|pantaloons|westside|brand\s*factory|shoes|footwear|bata)\b/i },

    // Electronics
    { category: 'Electronics', keywords: /\b(phone|laptop|gadget|electronic|croma|reliance\s*digital|flipkart|amazon|mobile\s*accessories)\b/i },

    // Shopping (general)
    { category: 'Shopping', keywords: /\b(shop|mall|store|dmart|big\s*bazaar|reliance\s*fresh|vishal\s*mega|market|flipkart|amazon|meesho|snapdeal)\b/i },

    // Gifts
    { category: 'Gifts', keywords: /\b(gift|present|surprise|birthday\s*gift|wedding\s*gift|ferns\s*n\s*petals|igp)\b/i },

    // Groceries
    { category: 'Groceries', keywords: /\b(grocer|kirana|vegetables|sabzi|fruits|bigbasket|blinkit|zepto|instamart|swiggy\s*instamart|milk|dairy|ration)\b/i },

    // Food (broadest — catches restaurants, street food, delivery)
    { category: 'Food', keywords: /\b(food|restaurant|hotel|dhaba|café|cafe|tea|chai|coffee|starbucks|ccd|biryani|pizza|burger|zomato|swiggy|eat|lunch|dinner|breakfast|snack|samosa|thali|mess|canteen|tiffin|bakery)\b/i },
];

// ─── Categorize Transaction ─────────────────────────────────────
export function categorizeTransaction(description: string, merchant?: string): Category {
    const text = `${description || ''} ${merchant || ''}`.trim();

    if (!text) return 'Other';

    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.test(text)) {
            return rule.category;
        }
    }

    return 'Other';
}

// ─── Suggest Category with Confidence ───────────────────────────
export function suggestCategory(description: string, merchant?: string): {
    category: Category;
    confidence: 'high' | 'medium' | 'low';
    allMatches: Category[];
} {
    const text = `${description || ''} ${merchant || ''}`.trim();
    const matches: Category[] = [];

    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.test(text)) {
            matches.push(rule.category);
        }
    }

    if (matches.length === 0) {
        return { category: 'Other', confidence: 'low', allMatches: [] };
    }

    return {
        category: matches[0], // first match = highest priority
        confidence: matches.length === 1 ? 'high' : 'medium',
        allMatches: matches,
    };
}
