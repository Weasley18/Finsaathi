// ─── Auto-Categorization Service ─────────────────────────────────
// Rule-based classifier for Indian transaction descriptions.
// Maps transaction descriptions/merchants to 25 Indian-context categories.
// Enhanced with UPI VPA matching, fintech apps, and improved coverage.

export const CATEGORIES = [
    'Food', 'Groceries', 'Transport', 'Autorickshaw', 'Fuel',
    'Shopping', 'Clothing', 'Electronics', 'EMI', 'Rent',
    'Utilities', 'Mobile Recharge', 'Entertainment', 'Health',
    'Education', 'Festival', 'Pooja', 'Insurance', 'Investment',
    'Subscription', 'Personal Care', 'Gifts', 'Bill Payments',
    'Transfer', 'Other',
] as const;

export type Category = typeof CATEGORIES[number];

// ─── UPI VPA Mapping ─────────────────────────────────────────────
// Common UPI VPA handles to categories
const VPA_RULES: Array<{ pattern: RegExp; category: Category }> = [
    { pattern: /@paytm$/i, category: 'Shopping' },
    { pattern: /@okaxis|@okhdfcbank|@oksbi|@okicici/i, category: 'Transfer' },
    { pattern: /swiggy|zomato/i, category: 'Food' },
    { pattern: /bigbasket|blinkit|zepto|instamart|grofers/i, category: 'Groceries' },
    { pattern: /uber|ola|rapido|nammayatri/i, category: 'Autorickshaw' },
    { pattern: /irctc|redbus/i, category: 'Transport' },
    { pattern: /netflix|hotstar|spotify|prime/i, category: 'Subscription' },
    { pattern: /lic|insurance|starhealth/i, category: 'Insurance' },
    { pattern: /groww|zerodha|kuvera|coin/i, category: 'Investment' },
    { pattern: /cred\.club|cred/i, category: 'Bill Payments' },
    { pattern: /slice|fi\.money|jupiter|niyo/i, category: 'Bill Payments' },
    { pattern: /bajajfinserv|homecredit/i, category: 'EMI' },
    { pattern: /apollo|medplus|pharmeasy|1mg|netmeds/i, category: 'Health' },
    { pattern: /bescom|tatapower|msedcl/i, category: 'Utilities' },
    { pattern: /myntra|ajio|flipkart|amazon|meesho/i, category: 'Shopping' },
];

// ─── Category Rules ──────────────────────────────────────────────
// Each rule has keywords that match against description + merchant.
// Priority: first match wins. More specific rules go first.
const CATEGORY_RULES: Array<{ category: Category; keywords: RegExp }> = [
    // EMI / Loans (check first — very specific)
    { category: 'EMI', keywords: /\b(emi|loan|repayment|instalment|installment|bajaj\s*fin|hdfc\s*ltd|home\s*credit|lendingkart|lending|navi\s*loan|cashbean|moneyview|kreditbee|early\s*salary)\b/i },

    // Rent
    { category: 'Rent', keywords: /\b(rent|landlord|house\s*rent|pg\s*charges|hostel|nobroker|nestaway|flat\s*rent|room\s*rent|society\s*maintenance)\b/i },

    // Insurance
    { category: 'Insurance', keywords: /\b(insurance|premium|lic|policy|health\s*cover|term\s*plan|star\s*health|icici\s*pru|sbi\s*life|hdfc\s*life|max\s*life|kotak\s*life|aegon|acko|digit\s*insurance)\b/i },

    // Investment
    { category: 'Investment', keywords: /\b(sip|mutual\s*fund|invest|zerodha|groww|kuvera|paytm\s*money|gold|ppf|nps|fd|fixed\s*deposit|upstox|angel\s*one|motilal|smallcase|coin\s*by\s*zerodha|etf|sovereign\s*gold\s*bond|sgb)\b/i },

    // Bill Payments (new — fintech + credit card)
    { category: 'Bill Payments', keywords: /\b(cred|bill\s*pay|credit\s*card\s*bill|slice|fi\s*money|jupiter|niyo|razorpay|payu|phonepe\s*bill|utility\s*bill|water\s*bill)\b/i },

    // Transfer
    { category: 'Transfer', keywords: /\b(neft|imps|rtgs|bank\s*transfer|upi\s*transfer|money\s*transfer|fund\s*transfer|self\s*transfer|cash\s*withdrawal|atm)\b/i },

    // Subscription
    { category: 'Subscription', keywords: /\b(netflix|hotstar|spotify|prime|youtube\s*premium|jio\s*cinema|subscription|ott|audible|zee5|sonyliv|voot|mxplayer|gaana|wynk|apple\s*music|icloud)\b/i },

    // Mobile Recharge
    { category: 'Mobile Recharge', keywords: /\b(recharge|airtel|jio|vi\s|vodafone|bsnl|mobile\s*plan|prepaid|postpaid|dth|tata\s*sky|d2h|dish\s*tv)\b/i },

    // Utilities
    { category: 'Utilities', keywords: /\b(electricity|electric|water\s*bill|gas\s*bill|utility|bescom|tata\s*power|piped\s*gas|broadband|wifi|internet\s*bill|msedcl|adani\s*electricity|torrent\s*power|lpg\s*cylinder|indane|bharat\s*gas)\b/i },

    // Education
    { category: 'Education', keywords: /\b(school|college|university|tuition|coaching|course|udemy|coursera|exam\s*fee|books|stationery|unacademy|byju|vedantu|whitehat|toppr|khan\s*academy|skillshare|linkedin\s*learning)\b/i },

    // Health / Medical
    { category: 'Health', keywords: /\b(hospital|doctor|clinic|medical|pharmacy|medicine|apollo|medplus|pharmeasy|1mg|netmeds|diagnostic|lab\s*test|dental|practo|tata\s*health|mfine|lybrate|healthian|thyrocare|dr\s*lal|srl\s*diagnostics)\b/i },

    // Autorickshaw / cab
    { category: 'Autorickshaw', keywords: /\b(auto|rickshaw|ola|uber|rapido|namma\s*yatri|cab|taxi|indriver|meru)\b/i },

    // Fuel
    { category: 'Fuel', keywords: /\b(petrol|diesel|fuel|hp\s*pump|ioc|bpcl|filling\s*station|ev\s*charge|cng|indian\s*oil|hindustan\s*petroleum)\b/i },

    // Transport (bus, metro, train)
    { category: 'Transport', keywords: /\b(bus|metro|train|irctc|railway|bmtc|ksrtc|redbus|uber\s*moto|bike\s*taxi|toll|fastag|makemytrip|goibibo|cleartrip|flight|airport|indigo|spicejet|air\s*india|vistara)\b/i },

    // Festival / Religious
    { category: 'Festival', keywords: /\b(festival|diwali|holi|eid|christmas|pongal|onam|rakhi|navratri|durga\s*puja|ganesh)\b/i },
    { category: 'Pooja', keywords: /\b(pooja|puja|temple|mandir|gurudwara|mosque|church|donation|dakshina|prasad|havan|charity|ngo)\b/i },

    // Entertainment
    { category: 'Entertainment', keywords: /\b(movie|cinema|pvr|inox|game|gaming|concert|event|park|zoo|museum|bowling|pub|bar|club|bookmyshow|paytm\s*insider|amusement)\b/i },

    // Personal Care
    { category: 'Personal Care', keywords: /\b(salon|haircut|spa|parlour|parlor|grooming|urban\s*company|beauty|cosmetic|makeup|nykaa|mamaearth|wow|beardo)\b/i },

    // Clothing
    { category: 'Clothing', keywords: /\b(cloth|apparel|fashion|myntra|ajio|zara|h&m|pantaloons|westside|brand\s*factory|shoes|footwear|bata|decathlon|lifestyle|max\s*fashion|allen\s*solly)\b/i },

    // Electronics
    { category: 'Electronics', keywords: /\b(phone|laptop|gadget|electronic|croma|reliance\s*digital|flipkart|amazon|mobile\s*accessories|vijay\s*sales|poorvika|samsung|apple\s*store)\b/i },

    // Shopping (general)
    { category: 'Shopping', keywords: /\b(shop|mall|store|dmart|big\s*bazaar|reliance\s*fresh|vishal\s*mega|market|flipkart|amazon|meesho|snapdeal|shopclues|tatacliq|jiomart|spencer)\b/i },

    // Gifts
    { category: 'Gifts', keywords: /\b(gift|present|surprise|birthday\s*gift|wedding\s*gift|ferns\s*n\s*petals|igp|fnp|archies)\b/i },

    // Groceries
    { category: 'Groceries', keywords: /\b(grocer|kirana|vegetables|sabzi|fruits|bigbasket|blinkit|zepto|instamart|swiggy\s*instamart|milk|dairy|ration|nature.*basket|country\s*delight)\b/i },

    // Food (broadest — catches restaurants, street food, delivery)
    { category: 'Food', keywords: /\b(food|restaurant|hotel|dhaba|café|cafe|tea|chai|coffee|starbucks|ccd|biryani|pizza|burger|zomato|swiggy|eat|lunch|dinner|breakfast|snack|samosa|thali|mess|canteen|tiffin|bakery|domino|mcdonald|kfc|subway|haldiram|barbeque\s*nation)\b/i },
];

// ─── Categorize via UPI VPA ──────────────────────────────────────
function categorizeByVPA(vpa: string): Category | null {
    for (const rule of VPA_RULES) {
        if (rule.pattern.test(vpa)) {
            return rule.category;
        }
    }
    return null;
}

// ─── Categorize Transaction ─────────────────────────────────────
export function categorizeTransaction(description: string, merchant?: string): Category {
    const text = `${description || ''} ${merchant || ''}`.trim();

    if (!text) return 'Other';

    // Try UPI VPA match first (if description contains @)
    const vpaMatch = text.match(/([a-zA-Z0-9._]+@[a-zA-Z]+)/);
    if (vpaMatch) {
        const vpaCategory = categorizeByVPA(vpaMatch[1]);
        if (vpaCategory) return vpaCategory;
    }

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

    // Check VPA match
    const vpaMatch = text.match(/([a-zA-Z0-9._]+@[a-zA-Z]+)/);
    if (vpaMatch) {
        const vpaCategory = categorizeByVPA(vpaMatch[1]);
        if (vpaCategory) matches.push(vpaCategory);
    }

    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.test(text)) {
            matches.push(rule.category);
        }
    }

    if (matches.length === 0) {
        return { category: 'Other', confidence: 'low', allMatches: [] };
    }

    // Deduplicate
    const unique = [...new Set(matches)];

    return {
        category: unique[0], // first match = highest priority
        confidence: unique.length === 1 ? 'high' : 'medium',
        allMatches: unique,
    };
}
