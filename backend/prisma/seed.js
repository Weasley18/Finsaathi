import { PrismaClient, TransactionType, TransactionSource, BudgetPeriod, GoalStatus, IncomeRange, RiskProfile, AdvisorTier } from '@prisma/client';
const prisma = new PrismaClient();
const LOCATIONS = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'];
const MERCHANT_CATEGORIES = {
    Food: ['Swiggy', 'Zomato', 'Grocery Mart', 'Chai Point', 'Local Dhaba', 'Starbucks', 'Dominos'],
    Transport: ['Uber', 'Ola', 'Metro Card', 'Fuel Station', 'Auto Rickshaw', 'Rapido'],
    Shopping: ['Amazon', 'Flipkart', 'DMart', 'Big Bazaar', 'Myntra', 'Zudio'],
    Bills: ['Electricity Board', 'Jio Recharge', 'Water Bill', 'Gas Bill', 'Broadband'],
    Health: ['Apollo Pharmacy', 'Medplus', 'Dr. Sharma Clinic', 'Practo', 'Tata 1mg'],
    Entertainment: ['Netflix', 'Spotify', 'BookMyShow', 'PVR Cinemas', 'Steam'],
    Education: ['Coursera', 'Udemy', 'Kindle', 'College Fees'],
    EMI: ['Home Loan', 'Car Loan', 'Personal Loan', 'Credit Card Bill'],
    Investment: ['Zerodha', 'Groww', 'SIP', 'PPF'],
};
// Helpers for random data
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
async function createFinancialDataForUser(userId) {
    const now = new Date();
    const transactions = [];
    // 1. Income (Salary)
    for (let m = 0; m < 3; m++) {
        const salaryDate = new Date(now.getFullYear(), now.getMonth() - m, 1); // 1st of month
        transactions.push({
            userId,
            amount: randomInt(40000, 120000),
            type: TransactionType.INCOME,
            category: 'Salary',
            merchant: 'TechCorp Solutions',
            description: 'Monthly Salary Credit',
            source: TransactionSource.UPI,
            date: salaryDate,
        });
    }
    // 2. Expenses
    for (let m = 0; m < 3; m++) {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 0).getDate();
        const numTxns = randomInt(15, 30); // 15-30 txns per month
        for (let i = 0; i < numTxns; i++) {
            const category = randomItem(Object.keys(MERCHANT_CATEGORIES));
            const merchant = randomItem(MERCHANT_CATEGORIES[category]);
            const amount = category === 'EMI' ? randomInt(5000, 15000) : randomInt(50, 3000);
            transactions.push({
                userId,
                amount,
                type: TransactionType.EXPENSE,
                category,
                merchant,
                description: `${category} spend at ${merchant}`,
                source: randomItem([TransactionSource.UPI, TransactionSource.SMS, TransactionSource.MANUAL]),
                date: new Date(now.getFullYear(), now.getMonth() - m, randomInt(1, daysInMonth)),
            });
        }
    }
    await prisma.transaction.createMany({ data: transactions });
    // 3. Budgets
    const budgets = [
        { userId, category: 'Food', limit: 8000, period: BudgetPeriod.MONTHLY },
        { userId, category: 'Shopping', limit: 5000, period: BudgetPeriod.MONTHLY },
        { userId, category: 'Transport', limit: 3000, period: BudgetPeriod.MONTHLY },
    ];
    await prisma.budget.createMany({ data: budgets });
    // 4. Goals
    const goals = [
        {
            userId,
            name: 'Emergency Fund',
            targetAmount: 100000,
            currentAmount: randomInt(10000, 50000),
            status: GoalStatus.ACTIVE,
            icon: 'shield',
        },
        {
            userId,
            name: 'Vacation',
            targetAmount: 50000,
            currentAmount: randomInt(5000, 20000),
            status: GoalStatus.ACTIVE,
            icon: 'plane',
        },
    ];
    await prisma.goal.createMany({ data: goals });
    // 5. Financial Profile
    await prisma.financialProfile.create({
        data: {
            userId,
            healthScore: randomInt(40, 95),
            savingsRate: randomInt(10, 40),
            debtToIncome: randomInt(10, 50) / 100,
            emergencyFundMonths: randomInt(1, 6),
            investmentDiversity: randomInt(20, 80) / 100,
            spendingVolatility: randomInt(10, 90),
            goalAdherence: randomInt(30, 100),
        },
    });
}
async function seed() {
    console.log('🌱 Seeding FinSaathi database...');
    // Clean up
    await prisma.advisorClient.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.document.deleteMany();
    await prisma.financialProfile.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.otpCode.deleteMany();
    await prisma.user.deleteMany();
    // ─── Create Core Users ──────────────────────────────────────
    // 1. Advisor
    const advisor = await prisma.user.create({
        data: {
            phone: '9876543211',
            name: 'Priya Sharma',
            role: 'ADVISOR',
            tier: AdvisorTier.PREMIUM,
            isActive: true,
        },
    });
    console.log('✅ Advisor created: Priya Sharma (9876543211)');
    // 2. Admin
    const admin = await prisma.user.create({
        data: {
            phone: '9876543212',
            name: 'Admin User',
            role: 'ADMIN',
            isActive: true,
        },
    });
    console.log('✅ Admin created: Admin User (9876543212)');
    // 3. Main End User (Rahul)
    const rahul = await prisma.user.create({
        data: {
            phone: '9876543210',
            name: 'Rahul Kumar',
            role: 'END_USER',
            incomeRange: IncomeRange.FROM_50K_TO_1L,
            riskProfile: RiskProfile.MODERATE,
            isActive: true,
        },
    });
    console.log('✅ User created: Rahul Kumar (9876543210)');
    // Assign Rahul to Priya
    await prisma.advisorClient.create({
        data: { advisorId: advisor.id, clientId: rahul.id },
    });
    await createFinancialDataForUser(rahul.id);
    console.log('   -> Data & Advisor assigned');
    // ─── Create Extra Random Users ──────────────────────────────
    const extraUsers = [
        { name: 'Amit Verma', phone: '9000000001' },
        { name: 'Sneha Patel', phone: '9000000002' },
        { name: 'Vikram Singh', phone: '9000000003' },
        { name: 'Anjali Das', phone: '9000000004' },
        { name: 'Rohan Mehta', phone: '9000000005' },
    ];
    for (const u of extraUsers) {
        const user = await prisma.user.create({
            data: {
                phone: u.phone,
                name: u.name,
                role: 'END_USER',
                incomeRange: IncomeRange.FROM_25K_TO_50K,
                riskProfile: RiskProfile.CONSERVATIVE,
            },
        });
        await createFinancialDataForUser(user.id);
        // Assign some to Advisor Priya
        if (Math.random() > 0.3) {
            await prisma.advisorClient.create({
                data: { advisorId: advisor.id, clientId: user.id },
            });
            console.log(`✅ Created ${u.name} (${u.phone}) -> Assigned to Advisor`);
        }
        else {
            console.log(`✅ Created ${u.name} (${u.phone}) -> No Advisor`);
        }
    }
    // ─── Create Notifications ──────────────────────────────────
    await prisma.notification.createMany({
        data: [
            { userId: rahul.id, title: 'Welcome!', message: 'Welcome to FinSaathi. Complete your profile.', type: 'INFO' },
            { userId: rahul.id, title: 'Budget Alert', message: 'You have exceeded 80% of your Food budget.', type: 'WARNING' },
            { userId: advisor.id, title: 'New Client', message: 'Rahul Kumar has been assigned to you.', type: 'SUCCESS' },
        ]
    });
    console.log('\n✨ Seeding completed successfully!');
}
seed()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map