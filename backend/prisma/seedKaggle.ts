  /**
 * Kaggle Personal Finance Dataset Seed
 * ======================================
 * Based on: https://www.kaggle.com/datasets/ramyapintchy/personal-finance-data
 *
 * Original dataset: 5 columns — Date, Transaction Description, Category, Amount, Type
 * Categories: Food & Drink, Rent, Utilities, Entertainment, Salary, Investment,
 *             Transportation, Clothing, Healthcare, Miscellaneous, Freelance Income,
 *             Dining Out, Groceries, Subscriptions, Gym Membership, Gift
 *
 * This script:
 *  1. Seeds ~600 transactions (representative of the ~1800-row dataset)
 *     for the END_USER "Rahul Kumar" (phone 9000000007)
 *  2. Shifts dates to Sep 2025 – Feb 2026
 *  3. Includes budgets that match the transaction categories
 *  4. Keeps Indian-context merchants (FinSaathi audience)
 */

import {
    PrismaClient,
    TransactionType,
    TransactionSource,
    BudgetPeriod,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────
const rand = (min: number, max: number) =>
    Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function randomDate(year: number, month: number): Date {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = randInt(1, daysInMonth);
    const hour = randInt(6, 22);
    const min = randInt(0, 59);
    return new Date(year, month, day, hour, min);
}

// ─── Kaggle Dataset Category → Transaction Templates ─────────────
// Each template represents a real row pattern from the Kaggle dataset,
// adapted to Indian merchants for FinSaathi context.

interface TxnTemplate {
    category: string;
    type: TransactionType;
    descriptions: { desc: string; merchant: string }[];
    amountRange: [number, number];
    monthlyFreq: [number, number]; // min–max occurrences per month
    source: TransactionSource;
}

const KAGGLE_TEMPLATES: TxnTemplate[] = [
    // ── INCOME ──────────────────────────────────────────────────
    {
        category: 'Salary',
        type: TransactionType.INCOME,
        descriptions: [
            { desc: 'Monthly Salary Credit', merchant: 'TechCorp Solutions Pvt Ltd' },
            { desc: 'Salary - February Pay', merchant: 'TechCorp Solutions Pvt Ltd' },
        ],
        amountRange: [72000, 78000],
        monthlyFreq: [1, 1],
        source: TransactionSource.UPI,
    },
    {
        category: 'Investment',
        type: TransactionType.INCOME,
        descriptions: [
            { desc: 'Dividend Credit – HDFC Mutual Fund', merchant: 'HDFC AMC' },
            { desc: 'FD Interest Credit', merchant: 'State Bank of India' },
            { desc: 'Mutual Fund Redemption', merchant: 'Groww' },
        ],
        amountRange: [1500, 8000],
        monthlyFreq: [0, 2],
        source: TransactionSource.UPI,
    },
    {
        category: 'Freelance',
        type: TransactionType.INCOME,
        descriptions: [
            { desc: 'Freelance Project Payment', merchant: 'Upwork' },
            { desc: 'Consulting Fee Received', merchant: 'Fiverr' },
            { desc: 'Side project income', merchant: 'Razorpay' },
        ],
        amountRange: [5000, 25000],
        monthlyFreq: [0, 2],
        source: TransactionSource.UPI,
    },

    // ── EXPENSES (Kaggle categories) ────────────────────────────

    // Food & Drink (Kaggle: "Food & Drink")
    {
        category: 'Food & Dining',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Swiggy order - Biryani + Drinks', merchant: 'Swiggy' },
            { desc: 'Zomato delivery - Dominos Pizza', merchant: 'Zomato' },
            { desc: 'Chai + Samosa at roadside', merchant: 'Chai Point' },
            { desc: 'Coffee and snacks', merchant: 'Starbucks' },
            { desc: 'Lunch at office canteen', merchant: 'Sodexo Canteen' },
            { desc: 'Weekend dinner with friends', merchant: 'Barbeque Nation' },
            { desc: 'Ice cream after dinner', merchant: 'Baskin Robbins' },
        ],
        amountRange: [80, 1200],
        monthlyFreq: [12, 22],
        source: TransactionSource.UPI,
    },

    // Groceries (Kaggle: "Groceries")
    {
        category: 'Groceries',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Weekly grocery shopping', merchant: 'DMart' },
            { desc: 'Monthly provisions', merchant: 'Big Bazaar' },
            { desc: 'Vegetables & fruits', merchant: 'Reliance Fresh' },
            { desc: 'Grocery Store Purchase', merchant: 'More Supermarket' },
            { desc: 'Blinkit quick commerce order', merchant: 'Blinkit' },
            { desc: 'BigBasket monthly staples', merchant: 'BigBasket' },
        ],
        amountRange: [200, 4500],
        monthlyFreq: [4, 8],
        source: TransactionSource.UPI,
    },

    // Rent (Kaggle: "Rent")
    {
        category: 'Rent',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Monthly Rent Payment', merchant: 'Landlord - Arun Mehta' },
            { desc: 'Flat Rent - Feb', merchant: 'Landlord - Arun Mehta' },
        ],
        amountRange: [15000, 15000],
        monthlyFreq: [1, 1],
        source: TransactionSource.UPI,
    },

    // Utilities (Kaggle: "Utilities")
    {
        category: 'Utilities',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Electricity Bill Payment', merchant: 'BESCOM' },
            { desc: 'Water Bill', merchant: 'Municipal Corporation' },
            { desc: 'Gas Cylinder Refill', merchant: 'HP Gas' },
            { desc: 'Piped Gas Bill', merchant: 'Mahanagar Gas' },
        ],
        amountRange: [400, 2800],
        monthlyFreq: [2, 4],
        source: TransactionSource.SMS,
    },

    // Transportation (Kaggle: "Transportation")
    {
        category: 'Transport',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Uber ride to office', merchant: 'Uber' },
            { desc: 'Ola auto to market', merchant: 'Ola' },
            { desc: 'Metro Card Recharge', merchant: 'Delhi Metro' },
            { desc: 'Fuel Station - Petrol', merchant: 'Indian Oil' },
            { desc: 'Rapido bike taxi', merchant: 'Rapido' },
            { desc: 'Auto rickshaw fare', merchant: 'Auto Rickshaw' },
        ],
        amountRange: [50, 2000],
        monthlyFreq: [8, 15],
        source: TransactionSource.UPI,
    },

    // Entertainment (Kaggle: "Entertainment")
    {
        category: 'Entertainment',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Movie tickets - PVR', merchant: 'PVR Cinemas' },
            { desc: 'BookMyShow event tickets', merchant: 'BookMyShow' },
            { desc: 'Gaming credits purchase', merchant: 'Steam' },
            { desc: 'Comedy show tickets', merchant: 'BookMyShow' },
            { desc: 'Amusement park entry', merchant: 'Wonderla' },
        ],
        amountRange: [200, 2000],
        monthlyFreq: [2, 5],
        source: TransactionSource.UPI,
    },

    // Subscriptions (Kaggle: "Subscriptions")
    {
        category: 'Subscriptions',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Netflix Monthly Subscription', merchant: 'Netflix' },
            { desc: 'Spotify Premium', merchant: 'Spotify' },
            { desc: 'Amazon Prime renewal', merchant: 'Amazon' },
            { desc: 'YouTube Premium', merchant: 'Google' },
            { desc: 'JioCinema Premium', merchant: 'JioCinema' },
        ],
        amountRange: [149, 799],
        monthlyFreq: [2, 4],
        source: TransactionSource.UPI,
    },

    // Clothing (Kaggle: "Clothing")
    {
        category: 'Shopping',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Shirt + Trousers purchase', merchant: 'Myntra' },
            { desc: 'Ethnic wear for festival', merchant: 'Flipkart' },
            { desc: 'Shoes from Nike', merchant: 'Nike' },
            { desc: 'Winter jacket', merchant: 'Zudio' },
            { desc: 'Casual wear shopping', merchant: 'H&M' },
            { desc: 'Office formal set', merchant: 'Amazon' },
        ],
        amountRange: [500, 6000],
        monthlyFreq: [1, 4],
        source: TransactionSource.UPI,
    },

    // Healthcare (Kaggle: "Healthcare")
    {
        category: 'Healthcare',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Doctor consultation fee', merchant: 'Apollo Hospital' },
            { desc: 'Medicines from pharmacy', merchant: 'MedPlus' },
            { desc: 'Lab test - blood work', merchant: 'SRL Diagnostics' },
            { desc: 'Dental checkup', merchant: 'Dr. Sharma Dental' },
            { desc: 'Online medicine order', merchant: 'Tata 1mg' },
        ],
        amountRange: [200, 3500],
        monthlyFreq: [1, 3],
        source: TransactionSource.UPI,
    },

    // Gym Membership (Kaggle: "Gym Membership")
    {
        category: 'Fitness',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Gym Monthly Membership', merchant: 'Cult.fit' },
            { desc: 'Yoga class subscription', merchant: 'Sarva Yoga' },
        ],
        amountRange: [1500, 2500],
        monthlyFreq: [1, 1],
        source: TransactionSource.UPI,
    },

    // Dining Out (Kaggle: "Dining Out")
    {
        category: 'Food & Dining',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Restaurant dinner - anniversary', merchant: 'The Oberoi' },
            { desc: 'Cafe brunch with family', merchant: 'Third Wave Coffee' },
            { desc: 'Birthday party dinner', merchant: 'Mainland China' },
            { desc: 'Weekend brunch', merchant: 'Social' },
        ],
        amountRange: [800, 5000],
        monthlyFreq: [1, 3],
        source: TransactionSource.UPI,
    },

    // Gift (Kaggle: "Gift")
    {
        category: 'Gift',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Birthday gift for friend', merchant: 'Amazon' },
            { desc: 'Wedding gift', merchant: 'Flipkart' },
            { desc: 'Festival gift - Diwali', merchant: 'Archies Gallery' },
        ],
        amountRange: [500, 5000],
        monthlyFreq: [0, 2],
        source: TransactionSource.UPI,
    },

    // Miscellaneous (Kaggle: "Miscellaneous")
    {
        category: 'Other',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'ATM Cash Withdrawal', merchant: 'SBI ATM' },
            { desc: 'Laundry and dry cleaning', merchant: 'Pressto' },
            { desc: 'Home supplies', merchant: 'IKEA' },
            { desc: 'Phone screen repair', merchant: 'local repair shop' },
            { desc: 'Printing & stationery', merchant: 'Staples' },
        ],
        amountRange: [100, 3000],
        monthlyFreq: [1, 4],
        source: TransactionSource.MANUAL,
    },

    // Education (not in original Kaggle but common in finance data)
    {
        category: 'Education',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Udemy course purchase', merchant: 'Udemy' },
            { desc: 'Coursera subscription', merchant: 'Coursera' },
            { desc: 'Kindle ebook', merchant: 'Amazon Kindle' },
        ],
        amountRange: [300, 3000],
        monthlyFreq: [0, 2],
        source: TransactionSource.UPI,
    },

    // Telecom
    {
        category: 'Telecom',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Jio Mobile Recharge', merchant: 'Jio' },
            { desc: 'Airtel Broadband Bill', merchant: 'Airtel' },
            { desc: 'Vi Recharge', merchant: 'Vi' },
        ],
        amountRange: [299, 999],
        monthlyFreq: [1, 2],
        source: TransactionSource.SMS,
    },

    // EMI & Loans
    {
        category: 'EMI & Loans',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Home Loan EMI', merchant: 'HDFC Bank' },
            { desc: 'Personal Loan EMI', merchant: 'Bajaj Finance' },
            { desc: 'Credit Card Bill Payment', merchant: 'ICICI Bank' },
        ],
        amountRange: [5000, 18000],
        monthlyFreq: [1, 2],
        source: TransactionSource.SMS,
    },

    // Insurance
    {
        category: 'Insurance',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'Term Life Insurance Premium', merchant: 'LIC' },
            { desc: 'Health Insurance Premium', merchant: 'Star Health' },
            { desc: 'Vehicle Insurance Renewal', merchant: 'ICICI Lombard' },
        ],
        amountRange: [1500, 8000],
        monthlyFreq: [0, 1],
        source: TransactionSource.SMS,
    },

    // Investment (outflow)
    {
        category: 'Investment',
        type: TransactionType.EXPENSE,
        descriptions: [
            { desc: 'SIP Investment - ELSS Fund', merchant: 'Zerodha' },
            { desc: 'PPF Contribution', merchant: 'SBI PPF' },
            { desc: 'Mutual Fund Purchase', merchant: 'Groww' },
            { desc: 'NPS Tier-I Contribution', merchant: 'NPS Trust' },
        ],
        amountRange: [2000, 10000],
        monthlyFreq: [1, 3],
        source: TransactionSource.UPI,
    },
];

// ─── Anomaly Injection ─────────────────────────────────────────
// Add some deliberate anomalies so Isolation Forest can detect them
interface AnomalySpec {
    month: number; // 0-based month index in our 6-month window
    category: string;
    desc: string;
    merchant: string;
    amount: number;
    type: TransactionType;
}

const ANOMALIES: AnomalySpec[] = [
    // Unusually large food spend in Nov 2025 (Diwali parties)
    { month: 2, category: 'Food & Dining', desc: 'Lavish Diwali party - 30 guests', merchant: 'Taj Catering', amount: 25000, type: TransactionType.EXPENSE },
    { month: 2, category: 'Food & Dining', desc: 'Diwali sweets bulk order', merchant: 'Haldirams', amount: 8000, type: TransactionType.EXPENSE },

    // Spike in Shopping in Dec 2025 (year-end sales)
    { month: 3, category: 'Shopping', desc: 'iPhone 16 Pro purchase', merchant: 'Apple Store', amount: 134900, type: TransactionType.EXPENSE },
    { month: 3, category: 'Shopping', desc: 'Year-end electronics sale', merchant: 'Croma', amount: 45000, type: TransactionType.EXPENSE },

    // Healthcare spike in Jan 2026
    { month: 4, category: 'Healthcare', desc: 'Hospital emergency - dengue', merchant: 'Max Hospital', amount: 35000, type: TransactionType.EXPENSE },

    // Unusual income in Oct 2025 (Diwali bonus)
    { month: 1, category: 'Salary', desc: 'Diwali Performance Bonus', merchant: 'TechCorp Solutions Pvt Ltd', amount: 50000, type: TransactionType.INCOME },

    // Large unexpected transfer in Feb 2026
    { month: 5, category: 'Other', desc: 'Emergency family transfer', merchant: 'NEFT Transfer', amount: 40000, type: TransactionType.EXPENSE },
];

// ─── Generate 6 months of transactions ───────────────────────────
function generateTransactions(userId: string): any[] {
    const transactions: any[] = [];

    // 6 months: Sep 2025 (idx 0) → Feb 2026 (idx 5)
    const months = [
        { year: 2025, month: 8 },  // Sep 2025
        { year: 2025, month: 9 },  // Oct 2025
        { year: 2025, month: 10 }, // Nov 2025
        { year: 2025, month: 11 }, // Dec 2025
        { year: 2026, month: 0 },  // Jan 2026
        { year: 2026, month: 1 },  // Feb 2026
    ];

    for (let mi = 0; mi < months.length; mi++) {
        const { year, month } = months[mi];

        for (const tmpl of KAGGLE_TEMPLATES) {
            const freq = randInt(tmpl.monthlyFreq[0], tmpl.monthlyFreq[1]);

            for (let i = 0; i < freq; i++) {
                const entry = pick(tmpl.descriptions);
                const amount = rand(tmpl.amountRange[0], tmpl.amountRange[1]);

                transactions.push({
                    userId,
                    amount,
                    type: tmpl.type,
                    category: tmpl.category,
                    merchant: entry.merchant,
                    description: entry.desc,
                    source: tmpl.source,
                    date: randomDate(year, month),
                });
            }
        }

        // Inject anomalies for this month
        for (const a of ANOMALIES) {
            if (a.month === mi) {
                transactions.push({
                    userId,
                    amount: a.amount,
                    type: a.type,
                    category: a.category,
                    merchant: a.merchant,
                    description: a.desc,
                    source: TransactionSource.UPI,
                    date: randomDate(year, month),
                });
            }
        }
    }

    return transactions;
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
    console.log('🌱 Kaggle Personal Finance Dataset Seed');
    console.log('════════════════════════════════════════\n');

    // 1. Find the target END_USER (Rahul Kumar, phone 9000000007)
    const user = await prisma.user.findFirst({
        where: { phone: '9000000007', role: 'END_USER' },
    });

    if (!user) {
        console.error('❌ END_USER with phone 9000000007 not found. Run the main seed first.');
        process.exit(1);
    }
    console.log(`👤 Target user: ${user.name} (${user.phone}, id: ${user.id})`);

    // 2. Delete existing transaction data for this user (clean slate)
    const deletedTxns = await prisma.transaction.deleteMany({ where: { userId: user.id } });
    const deletedBudgets = await prisma.budget.deleteMany({ where: { userId: user.id } });
    const deletedProfile = await prisma.financialProfile.deleteMany({ where: { userId: user.id } });
    console.log(`🗑️  Cleared: ${deletedTxns.count} transactions, ${deletedBudgets.count} budgets, ${deletedProfile.count} profile\n`);

    // 3. Generate & insert transactions
    const transactions = generateTransactions(user.id);
    await prisma.transaction.createMany({ data: transactions });

    // Stats
    const incomeCount = transactions.filter(t => t.type === TransactionType.INCOME).length;
    const expenseCount = transactions.filter(t => t.type === TransactionType.EXPENSE).length;
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);

    console.log(`✅ Inserted ${transactions.length} transactions`);
    console.log(`   📈 Income:  ${incomeCount} txns → ₹${Math.round(totalIncome).toLocaleString('en-IN')}`);
    console.log(`   📉 Expense: ${expenseCount} txns → ₹${Math.round(totalExpense).toLocaleString('en-IN')}`);

    // Category breakdown
    const catMap: Record<string, { count: number; total: number }> = {};
    for (const t of transactions) {
        if (t.type !== TransactionType.EXPENSE) continue;
        if (!catMap[t.category]) catMap[t.category] = { count: 0, total: 0 };
        catMap[t.category].count++;
        catMap[t.category].total += t.amount;
    }
    console.log('\n   Category Breakdown (Expenses):');
    for (const [cat, data] of Object.entries(catMap).sort((a, b) => b[1].total - a[1].total)) {
        console.log(`     ${cat.padEnd(18)} ${String(data.count).padStart(3)} txns  ₹${Math.round(data.total).toLocaleString('en-IN').padStart(8)}`);
    }

    // Date range
    const dates = transactions.map(t => t.date.getTime());
    console.log(`\n   📅 Date range: ${new Date(Math.min(...dates)).toLocaleDateString()} → ${new Date(Math.max(...dates)).toLocaleDateString()}`);

    // 4. Create budgets matching the Kaggle categories
    const budgets = [
        { userId: user.id, category: 'Food & Dining', limit: 10000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Groceries', limit: 8000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Transport', limit: 4000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Shopping', limit: 5000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Entertainment', limit: 3000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Healthcare', limit: 3000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Subscriptions', limit: 2000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Utilities', limit: 5000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'EMI & Loans', limit: 20000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Investment', limit: 15000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Rent', limit: 15000, period: BudgetPeriod.MONTHLY },
        { userId: user.id, category: 'Telecom', limit: 1500, period: BudgetPeriod.MONTHLY },
    ];

    // Calculate current month (Feb 2026) spent for each budget
    const feb2026Start = new Date(2026, 1, 1);
    const feb2026End = new Date(2026, 2, 0, 23, 59, 59);
    const febTxns = transactions.filter(
        t => t.type === TransactionType.EXPENSE && t.date >= feb2026Start && t.date <= feb2026End
    );
    const febSpent: Record<string, number> = {};
    for (const t of febTxns) {
        febSpent[t.category] = (febSpent[t.category] || 0) + t.amount;
    }

    const budgetsWithSpent = budgets.map(b => ({
        ...b,
        spent: Math.round((febSpent[b.category] || 0) * 100) / 100,
    }));

    await prisma.budget.createMany({ data: budgetsWithSpent });
    console.log(`\n✅ Created ${budgets.length} budgets with current-month spent amounts`);

    // 5. Upsert financial profile
    await prisma.financialProfile.upsert({
        where: { userId: user.id },
        update: {
            healthScore: 68,
            savingsRate: 22,
            debtToIncome: 0.28,
            emergencyFundMonths: 3,
            investmentDiversity: 0.45,
            spendingVolatility: 55,
            goalAdherence: 72,
        },
        create: {
            userId: user.id,
            healthScore: 68,
            savingsRate: 22,
            debtToIncome: 0.28,
            emergencyFundMonths: 3,
            investmentDiversity: 0.45,
            spendingVolatility: 55,
            goalAdherence: 72,
        },
    });
    console.log('✅ Financial profile updated');

    // 6. Update user points
    await prisma.user.update({
        where: { id: user.id },
        data: { points: 520, streakDays: 22, lastActiveAt: new Date() },
    });
    console.log('✅ User points & streak updated\n');

    console.log('════════════════════════════════════════');
    console.log('✨ Kaggle dataset seeded successfully!');
    console.log('   Run the ML service and test:');
    console.log('   curl http://localhost:3001/api/insights/anomalies');
    console.log('   curl http://localhost:3001/api/insights/forecast');
    console.log('════════════════════════════════════════');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
