import {
    PrismaClient,
    TransactionType,
    TransactionSource,
    BudgetPeriod,
    GoalStatus,
    IncomeRange,
    RiskProfile,
    AdvisorTier,
    Role,
    ApprovalStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

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

// ─── Helpers ─────────────────────────────────────────────────────
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ─── Generate financial data for an end-user ─────────────────────
async function createFinancialDataForUser(userId: string) {
    const now = new Date();
    const transactions: any[] = [];

    // Income (3 months of salary)
    for (let m = 0; m < 3; m++) {
        transactions.push({
            userId,
            amount: randomInt(40000, 120000),
            type: TransactionType.INCOME,
            category: 'Salary',
            merchant: 'TechCorp Solutions',
            description: 'Monthly Salary Credit',
            source: TransactionSource.UPI,
            date: new Date(now.getFullYear(), now.getMonth() - m, 1),
        });
    }

    // Expenses (3 months)
    for (let m = 0; m < 3; m++) {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 0).getDate();
        const numTxns = randomInt(15, 30);

        for (let i = 0; i < numTxns; i++) {
            const category = randomItem(Object.keys(MERCHANT_CATEGORIES)) as keyof typeof MERCHANT_CATEGORIES;
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

    // Budgets
    await prisma.budget.createMany({
        data: [
            { userId, category: 'Food', limit: 8000, period: BudgetPeriod.MONTHLY },
            { userId, category: 'Shopping', limit: 5000, period: BudgetPeriod.MONTHLY },
            { userId, category: 'Transport', limit: 3000, period: BudgetPeriod.MONTHLY },
        ],
    });

    // Goals
    await prisma.goal.createMany({
        data: [
            { userId, name: 'Emergency Fund', targetAmount: 100000, currentAmount: randomInt(10000, 50000), status: GoalStatus.ACTIVE, icon: 'shield' },
            { userId, name: 'Vacation', targetAmount: 50000, currentAmount: randomInt(5000, 20000), status: GoalStatus.ACTIVE, icon: 'plane' },
        ],
    });

    // Financial Profile
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

// ─── Main Seed ───────────────────────────────────────────────────
async function seed() {
    console.log('🌱 Seeding FinSaathi database (10 users)...\n');

    // ── Clean up (order matters for FK constraints) ──────────────
    await prisma.partnerMatch.deleteMany();
    await prisma.partnerProduct.deleteMany();
    await prisma.advisorClient.deleteMany();
    await prisma.advisorProfile.deleteMany();
    await prisma.advisorNote.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.activityTracker.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.document.deleteMany();
    await prisma.financialProfile.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.otpCode.deleteMany();
    await prisma.user.deleteMany();

    console.log('🗑️  Cleared existing data.\n');

    // ═══════════════════════════════════════════════════════════════
    // 1. ADMINS (2)
    // ═══════════════════════════════════════════════════════════════
    const admin1 = await prisma.user.create({
        data: {
            phone: '9000000001',
            name: 'Rajesh Khanna',
            role: Role.ADMIN,
            approvalStatus: ApprovalStatus.APPROVED,
            language: 'en',
            isActive: true,
            points: 0,
            streakDays: 0,
        },
    });
    console.log(`✅ Admin  1: ${admin1.name} (${admin1.phone})`);

    const admin2 = await prisma.user.create({
        data: {
            phone: '9000000002',
            name: 'Sunita Reddy',
            role: Role.ADMIN,
            approvalStatus: ApprovalStatus.APPROVED,
            language: 'hi',
            isActive: true,
            points: 0,
            streakDays: 0,
        },
    });
    console.log(`✅ Admin  2: ${admin2.name} (${admin2.phone})`);

    // ═══════════════════════════════════════════════════════════════
    // 2. ADVISORS (2)
    // ═══════════════════════════════════════════════════════════════
    const advisor1 = await prisma.user.create({
        data: {
            phone: '9000000003',
            name: 'Priya Sharma',
            role: Role.ADVISOR,
            approvalStatus: ApprovalStatus.APPROVED,
            tier: AdvisorTier.PREMIUM,
            businessId: 'ARN-112345',
            language: 'en',
            isActive: true,
            points: 500,
            streakDays: 45,
            lastActiveAt: new Date(),
        },
    });
    console.log(`✅ Advisor 1: ${advisor1.name} (${advisor1.phone}) — PREMIUM`);

    const advisor2 = await prisma.user.create({
        data: {
            phone: '9000000004',
            name: 'Arjun Nair',
            role: Role.ADVISOR,
            approvalStatus: ApprovalStatus.APPROVED,
            tier: AdvisorTier.FREE,
            businessId: 'ARN-998877',
            language: 'ta',
            isActive: true,
            points: 200,
            streakDays: 12,
            lastActiveAt: new Date(),
        },
    });
    console.log(`✅ Advisor 2: ${advisor2.name} (${advisor2.phone}) — FREE`);

    // ═══════════════════════════════════════════════════════════════
    // 3. PARTNERS (2)
    // ═══════════════════════════════════════════════════════════════
    const partner1 = await prisma.user.create({
        data: {
            phone: '9000000005',
            name: 'FinServe Capital',
            role: Role.PARTNER,
            approvalStatus: ApprovalStatus.APPROVED,
            businessId: 'GSTIN22AAAAA0000A1Z5',
            language: 'en',
            isActive: true,
            points: 0,
            streakDays: 0,
            // Partner onboarding fields
            legalDocType: 'CIN',
            legalDocNumber: 'U74999MH2020PTC345678',
            registeredAddr: '301, FinServe Tower, BKC, Mumbai, Maharashtra 400051',
            regulatoryRegNumber: 'NBFC-N-07.00123',
            complianceOfficerEmail: 'compliance@finservecapital.in',
            complianceOfficerPhone: '+919876500001',
            technicalContactEmail: 'tech@finservecapital.in',
            technicalContactPhone: '+919876500002',
            webhookUrl: 'https://api.finservecapital.in/webhooks/finsaathi',
            oauthCompatible: true,
            digitalAcceptanceOfTerms: true,
            hasSignedDataProcessAgreement: true,
            hasSignedNoPIIAccess: true,
            hasSignedNoDataResale: true,
            hasSignedBreachReport: true,
        },
    });
    console.log(`✅ Partner 1: ${partner1.name} (${partner1.phone})`);

    const partner2 = await prisma.user.create({
        data: {
            phone: '9000000006',
            name: 'MicroLend India',
            role: Role.PARTNER,
            approvalStatus: ApprovalStatus.PENDING,
            businessId: 'GSTIN27BBBBB1111B2Z6',
            language: 'hi',
            isActive: true,
            points: 0,
            streakDays: 0,
            // Partner onboarding fields
            legalDocType: 'NGO_REGISTRATION',
            legalDocNumber: 'NGO-DL-2019-0987654',
            registeredAddr: '12, Microfinance Bhawan, Nehru Place, New Delhi 110019',
            regulatoryRegNumber: 'NGO-DARPAN-DL/2019/0234567',
            complianceOfficerEmail: 'compliance@microlendindia.org',
            complianceOfficerPhone: '+919876600001',
            technicalContactEmail: 'devops@microlendindia.org',
            technicalContactPhone: '+919876600002',
            webhookUrl: 'https://api.microlendindia.org/hooks/finsaathi',
            oauthCompatible: false,
            digitalAcceptanceOfTerms: true,
            hasSignedDataProcessAgreement: true,
            hasSignedNoPIIAccess: true,
            hasSignedNoDataResale: true,
            hasSignedBreachReport: false,
        },
    });
    console.log(`✅ Partner 2: ${partner2.name} (${partner2.phone}) — PENDING approval`);

    // ═══════════════════════════════════════════════════════════════
    // 4. END USERS (4)
    // ═══════════════════════════════════════════════════════════════
    const user1 = await prisma.user.create({
        data: {
            phone: '9000000007',
            name: 'Rahul Kumar',
            role: Role.END_USER,
            approvalStatus: ApprovalStatus.APPROVED,
            incomeRange: IncomeRange.FROM_50K_TO_1L,
            riskProfile: RiskProfile.MODERATE,
            areasOfInterest: ['Micro-savings', 'Debt Management'],
            language: 'hi',
            isActive: true,
            points: 320,
            streakDays: 15,
            lastActiveAt: new Date(),
        },
    });
    console.log(`✅ User   1: ${user1.name} (${user1.phone})`);

    const user2 = await prisma.user.create({
        data: {
            phone: '9000000008',
            name: 'Sneha Patel',
            role: Role.END_USER,
            approvalStatus: ApprovalStatus.APPROVED,
            incomeRange: IncomeRange.FROM_25K_TO_50K,
            riskProfile: RiskProfile.CONSERVATIVE,
            areasOfInterest: ['Retirement Planning', 'Micro-savings'],
            language: 'gu',
            isActive: true,
            points: 180,
            streakDays: 7,
            lastActiveAt: new Date(),
        },
    });
    console.log(`✅ User   2: ${user2.name} (${user2.phone})`);

    const user3 = await prisma.user.create({
        data: {
            phone: '9000000009',
            name: 'Vikram Singh',
            role: Role.END_USER,
            approvalStatus: ApprovalStatus.APPROVED,
            incomeRange: IncomeRange.ABOVE_1L,
            riskProfile: RiskProfile.AGGRESSIVE,
            areasOfInterest: ['Gig-Worker Financial Planning', 'Rural Microfinance', 'Debt Management'],
            language: 'en',
            isActive: true,
            points: 750,
            streakDays: 30,
            lastActiveAt: new Date(),
        },
    });
    console.log(`✅ User   3: ${user3.name} (${user3.phone})`);

    const user4 = await prisma.user.create({
        data: {
            phone: '9000000010',
            name: 'Anjali Das',
            role: Role.END_USER,
            approvalStatus: ApprovalStatus.APPROVED,
            incomeRange: IncomeRange.FROM_10K_TO_25K,
            riskProfile: RiskProfile.CONSERVATIVE,
            areasOfInterest: ['Micro-savings'],
            language: 'bn',
            isActive: true,
            points: 90,
            streakDays: 3,
            lastActiveAt: new Date(),
        },
    });
    console.log(`✅ User   4: ${user4.name} (${user4.phone})\n`);

    const endUsers = [user1, user2, user3, user4];

    // ═══════════════════════════════════════════════════════════════
    // 5. FINANCIAL DATA for all end users
    // ═══════════════════════════════════════════════════════════════
    for (const u of endUsers) {
        await createFinancialDataForUser(u.id);
        console.log(`📊 Financial data created for ${u.name}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. ADVISOR–CLIENT assignments
    // ═══════════════════════════════════════════════════════════════
    // Advisor 1 (Priya) gets user1 & user2
    await prisma.advisorClient.create({ data: { advisorId: advisor1.id, clientId: user1.id } });
    await prisma.advisorClient.create({ data: { advisorId: advisor1.id, clientId: user2.id } });
    // Advisor 2 (Arjun) gets user3
    await prisma.advisorClient.create({ data: { advisorId: advisor2.id, clientId: user3.id } });
    // user4 has no advisor
    console.log('\n🔗 Advisor-Client assignments created');

    // ═══════════════════════════════════════════════════════════════
    // 6b. ADVISOR PROFILES
    // ═══════════════════════════════════════════════════════════════
    await prisma.advisorProfile.create({
        data: {
            userId: advisor1.id,
            businessAddress: '504, Wealth Tower, Bandra West, Mumbai 400050',
            professionalEmail: 'priya.sharma@wealthadvisors.in',
            sebiCertificateIssueDate: new Date('2022-03-15'),
            sebiCertificateExpiryDate: new Date('2027-03-14'),
            baslMembershipId: 'BASL-2022-MH-04567',
            highestQualification: 'MBA Finance, IIM Ahmedabad, 2018',
            optionalCertifications: ['NISM-Series-V-A', 'NISM-Series-XVII'],
            languagesSpoken: ['English', 'Hindi', 'Marathi'],
            areasOfExpertise: ['Micro-savings', 'Debt Management', 'Retirement Planning'],
            feeModel: 'FLAT_FEE',
        },
    });

    await prisma.advisorProfile.create({
        data: {
            userId: advisor2.id,
            businessAddress: '22, Financial District, Anna Salai, Chennai 600002',
            professionalEmail: 'arjun.nair@nairfinance.co.in',
            sebiCertificateIssueDate: new Date('2023-07-01'),
            sebiCertificateExpiryDate: new Date('2028-06-30'),
            baslMembershipId: 'BASL-2023-TN-01234',
            highestQualification: 'B.Com, University of Madras, 2020',
            optionalCertifications: ['NISM-Series-XV'],
            languagesSpoken: ['English', 'Tamil'],
            areasOfExpertise: ['Gig-Worker Financial Planning', 'Rural Microfinance'],
            feeModel: 'NGO_SUBSIDIZED',
        },
    });
    console.log('🧑‍💼 Advisor profiles created');

    // ═══════════════════════════════════════════════════════════════
    // 6c. ADVISOR ONBOARDING DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    const docTypes = ['sebi_certificate', 'pan', 'nism_xa', 'nism_xb'] as const;
    const docLabels: Record<string, string> = {
        sebi_certificate: 'SEBI_Registration_Certificate.pdf',
        pan: 'PAN_Card.pdf',
        nism_xa: 'NISM_Series_X-A.pdf',
        nism_xb: 'NISM_Series_X-B.pdf',
    };

    // Advisor 1 — all docs VERIFIED (approved advisor)
    await prisma.document.createMany({
        data: docTypes.map((type) => ({
            userId: advisor1.id,
            type,
            fileName: docLabels[type],
            storageKey: `${advisor1.id}/${Date.now()}-${docLabels[type]}`,
            status: 'VERIFIED' as const,
            reviewNote: 'Verified by admin during onboarding approval',
        })),
    });

    // Advisor 2 — all docs VERIFIED (approved advisor)
    await prisma.document.createMany({
        data: docTypes.map((type) => ({
            userId: advisor2.id,
            type,
            fileName: docLabels[type],
            storageKey: `${advisor2.id}/${Date.now()}-${docLabels[type]}`,
            status: 'VERIFIED' as const,
            reviewNote: 'Verified by admin during onboarding approval',
        })),
    });
    console.log('📄 Advisor onboarding documents created');

    // ═══════════════════════════════════════════════════════════════
    // 7. ADVISOR NOTES
    // ═══════════════════════════════════════════════════════════════
    await prisma.advisorNote.createMany({
        data: [
            { advisorId: advisor1.id, clientId: user1.id, content: 'Rahul should increase SIP from ₹5000 to ₹8000 this quarter. He has headroom in his budget.', category: 'advice' },
            { advisorId: advisor1.id, clientId: user1.id, content: 'Emergency fund is only at 2 months. Priority: build to 6 months before vacation goal.', category: 'action_plan' },
            { advisorId: advisor1.id, clientId: user2.id, content: 'Sneha is a disciplined saver. Recommend diversifying into index funds.', category: 'observation' },
            { advisorId: advisor2.id, clientId: user3.id, content: 'Vikram has aggressive risk profile. Review portfolio allocation; too concentrated in mid-caps.', category: 'advice' },
            { advisorId: advisor2.id, content: 'General tip: clients in the 25-35 age bracket should prioritize term insurance before investments.', category: 'general_tip' },
        ],
    });
    console.log('📝 Advisor notes created');

    // ═══════════════════════════════════════════════════════════════
    // 8. PARTNER PRODUCTS
    // ═══════════════════════════════════════════════════════════════
    const product1 = await prisma.partnerProduct.create({
        data: {
            partnerId: partner1.id,
            name: 'QuickCash Microloan',
            description: 'Instant microloan up to ₹50,000 for salaried individuals.',
            type: 'microloan',
            eligibilityCriteria: JSON.stringify({ incomeRange: 'FROM_25K_TO_50K', employmentType: 'salaried' }),
            interestRate: 14.5,
            minAmount: 5000,
            maxAmount: 50000,
            isActive: true,
        },
    });

    const product2 = await prisma.partnerProduct.create({
        data: {
            partnerId: partner1.id,
            name: 'SafeGuard Term Insurance',
            description: '₹1 Crore term cover starting at ₹500/month.',
            type: 'insurance',
            eligibilityCriteria: JSON.stringify({ minAge: 21, maxAge: 55 }),
            isActive: true,
        },
    });

    const product3 = await prisma.partnerProduct.create({
        data: {
            partnerId: partner2.id,
            name: 'Village Growth Loan',
            description: 'Low-interest loans for rural entrepreneurs.',
            type: 'microloan',
            eligibilityCriteria: JSON.stringify({ incomeRange: 'BELOW_10K', location: 'rural' }),
            interestRate: 9.0,
            minAmount: 10000,
            maxAmount: 200000,
            isActive: true,
        },
    });

    console.log('🏦 Partner products created');

    // ═══════════════════════════════════════════════════════════════
    // 9. PARTNER MATCHES
    // ═══════════════════════════════════════════════════════════════
    await prisma.partnerMatch.createMany({
        data: [
            { productId: product1.id, userId: user2.id, status: 'MATCHED' },
            { productId: product2.id, userId: user1.id, status: 'APPLIED' },
            { productId: product2.id, userId: user3.id, status: 'MATCHED' },
            { productId: product3.id, userId: user4.id, status: 'MATCHED' },
        ],
    });
    console.log('🤝 Partner matches created');

    // ═══════════════════════════════════════════════════════════════
    // 10. BADGES & ACTIVITIES
    // ═══════════════════════════════════════════════════════════════
    await prisma.badge.createMany({
        data: [
            { userId: user1.id, name: 'First Budget', description: 'Created your first budget', icon: '🎯' },
            { userId: user1.id, name: '7-Day Streak', description: 'Logged expenses for 7 days straight', icon: '🔥' },
            { userId: user2.id, name: 'Savings Star', description: 'Saved 30% of income for a month', icon: '⭐' },
            { userId: user3.id, name: 'Goal Setter', description: 'Created your first savings goal', icon: '🏆' },
            { userId: user3.id, name: '30-Day Streak', description: 'Logged expenses for 30 days straight', icon: '💪' },
            { userId: user4.id, name: 'First Budget', description: 'Created your first budget', icon: '🎯' },
        ],
    });

    await prisma.activityTracker.createMany({
        data: [
            { userId: user1.id, action: 'LOG_EXPENSE', points: 10 },
            { userId: user1.id, action: 'CREATE_GOAL', points: 50 },
            { userId: user1.id, action: 'READ_LESSON', points: 20 },
            { userId: user2.id, action: 'LOG_EXPENSE', points: 10 },
            { userId: user2.id, action: 'LOG_EXPENSE', points: 10 },
            { userId: user3.id, action: 'CREATE_GOAL', points: 50 },
            { userId: user3.id, action: 'LOG_EXPENSE', points: 10 },
            { userId: user3.id, action: 'READ_LESSON', points: 20 },
            { userId: user4.id, action: 'LOG_EXPENSE', points: 10 },
        ],
    });
    console.log('🏅 Badges & activities created');

    // ═══════════════════════════════════════════════════════════════
    // 11. NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    await prisma.notification.createMany({
        data: [
            { userId: user1.id, title: 'Welcome!', message: 'Welcome to FinSaathi, Rahul! Start by logging your daily expenses.', type: 'INFO' },
            { userId: user1.id, title: 'Budget Alert', message: 'You have used 80% of your Food budget this month.', type: 'WARNING' },
            { userId: user2.id, title: 'Great Saving!', message: 'You saved 35% of your income last month. Keep it up!', type: 'SUCCESS' },
            { userId: user3.id, title: 'Goal Milestone', message: 'Your Emergency Fund is now at 50%!', type: 'SUCCESS' },
            { userId: user4.id, title: 'Welcome!', message: 'Welcome to FinSaathi, Anjali! Complete your profile to get started.', type: 'INFO' },
            { userId: advisor1.id, title: 'New Client', message: 'Rahul Kumar has been assigned to you.', type: 'SUCCESS' },
            { userId: advisor1.id, title: 'New Client', message: 'Sneha Patel has been assigned to you.', type: 'SUCCESS' },
            { userId: advisor2.id, title: 'New Client', message: 'Vikram Singh has been assigned to you.', type: 'SUCCESS' },
            { userId: admin1.id, title: 'Partner Pending', message: 'MicroLend India is awaiting approval.', type: 'WARNING' },
        ],
    });
    console.log('🔔 Notifications created');

    // ═══════════════════════════════════════════════════════════════
    // 12. LESSONS & SCHEMES (content)
    // ═══════════════════════════════════════════════════════════════
    await prisma.lesson.createMany({
        data: [
            { title: 'Budgeting 101', description: 'Learn the basics of budgeting', content: '# Budgeting 101\n\nA budget is a plan for your money...', icon: '📒', difficulty: 'BEGINNER', category: 'Savings', isActive: true },
            { title: 'Understanding SIPs', description: 'How Systematic Investment Plans work', content: '# SIP Guide\n\nSIP lets you invest small amounts regularly...', icon: '📈', difficulty: 'INTERMEDIATE', category: 'Investing', isActive: true },
            { title: 'Tax Saving Strategies', description: 'Reduce your tax liability legally', content: '# Tax Savings\n\nSection 80C, 80D, and more...', icon: '🧾', difficulty: 'ADVANCED', category: 'Tax', isActive: true },
        ],
    });

    await prisma.scheme.createMany({
        data: [
            { name: 'PM Jan Dhan Yojana', description: 'Zero-balance savings accounts for all', eligibility: 'Any Indian citizen without a bank account', benefits: 'Free savings account, ₹2 lakh insurance', link: 'https://pmjdy.gov.in', isActive: true },
            { name: 'Atal Pension Yojana', description: 'Guaranteed pension for the unorganised sector', eligibility: 'Age 18-40, Indian citizen', benefits: 'Monthly pension of ₹1000-₹5000 after age 60', link: 'https://npscra.nsdl.co.in/scheme-details.php', isActive: true },
        ],
    });
    console.log('📚 Lessons & schemes created');

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(50));
    console.log('✨ Seeding completed! 10 users created:');
    console.log('═'.repeat(50));
    console.log(`  👑 Admins:    ${admin1.name} (${admin1.phone}), ${admin2.name} (${admin2.phone})`);
    console.log(`  🧑‍💼 Advisors:  ${advisor1.name} (${advisor1.phone}), ${advisor2.name} (${advisor2.phone})`);
    console.log(`  🏢 Partners:  ${partner1.name} (${partner1.phone}), ${partner2.name} (${partner2.phone})`);
    console.log(`  👤 Users:     ${user1.name} (${user1.phone}), ${user2.name} (${user2.phone})`);
    console.log(`                ${user3.name} (${user3.phone}), ${user4.name} (${user4.phone})`);
    console.log('═'.repeat(50));
}

seed()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
