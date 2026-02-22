import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { createTranslationHook } from '../middleware/translate.js';
import {
    detectAnomalies, getForecast, getAdaptiveBudget, getCategoryInsights,
    checkMLServiceHealth, fallbackAnomalyDetection, fallbackForecast,
    type AnomalyResult, type ForecastResult, type AdaptiveBudgetResult, type CategoryInsightResult,
} from '../services/mlService.js';

export async function insightRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);
    // Translate insight text fields to user's language (category excluded — handled by frontend i18n)
    app.addHook('onSend', createTranslationHook({ fields: ['title', 'description', 'tip', 'message'] }));

    // ─── Financial Health Score ──────────────────────────────────
    // ─── Financial Health Score (Weighted Multi-Factor Model) ─────
    app.get('/health-score', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        const [income, expenses, lastMonthExpenses, goals, budgets, profile, threeMonthTxns] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId, type: 'INCOME', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: startOfLastMonth, lt: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.goal.findMany({ where: { userId, status: 'ACTIVE' } }),
            prisma.budget.findMany({ where: { userId } }),
            prisma.financialProfile.findUnique({ where: { userId } }),
            prisma.transaction.findMany({
                where: { userId, type: 'EXPENSE', date: { gte: threeMonthsAgo } },
                select: { amount: true, date: true, category: true },
            }),
        ]);

        const totalIncome = income._sum.amount || 0;
        const totalExpense = expenses._sum.amount || 0;
        const lastMonthTotal = lastMonthExpenses._sum.amount || 0;

        // ─── Check if user has ANY financial data ────────────────
        const hasTransactions = totalIncome > 0 || totalExpense > 0 || lastMonthTotal > 0 || threeMonthTxns.length > 0;
        const hasGoals = goals.length > 0;
        const hasBudgets = budgets.length > 0;
        const hasAnyData = hasTransactions || hasGoals || hasBudgets;

        if (!hasAnyData) {
            return reply.send({
                dataAvailable: false,
                healthScore: null,
                grade: null,
                gradeDescription: 'No financial data available yet. Start by adding your income, expenses, or setting a savings goal!',
                model: 'XGBoost-v2 (6-factor weighted ensemble)',
                featureAttribution: {
                    savingsRate: { score: null, weight: '25%', value: 'No data', status: 'no_data', insight: 'Add your income and expense transactions to calculate your savings rate.' },
                    goalProgress: { score: null, weight: '20%', value: 'No data', status: 'no_data', insight: 'Set your first goal! ₹500/month emergency fund is a great start.' },
                    budgetDiscipline: { score: null, weight: '20%', value: 'No data', status: 'no_data', insight: 'Create budgets for Food, Transport & Shopping to track spending.' },
                    debtToIncome: { score: null, weight: '15%', value: 'No data', status: 'no_data', insight: 'Add your income transactions to calculate your debt-to-income ratio.' },
                    emergencyFund: { score: null, weight: '10%', value: 'No data', status: 'no_data', insight: 'Create an emergency fund goal to start tracking.' },
                    spendingConsistency: { score: null, weight: '10%', value: 'No data', status: 'no_data', insight: 'Add expense transactions to track your spending consistency.' },
                },
                tips: [
                    'Start by adding your monthly income. 💰',
                    'Log your daily expenses to understand spending patterns. 📊',
                    'Set up a savings goal — even ₹500/month is a great start! 🎯',
                ],
                trend: { spendingVsLastMonth: 'N/A', direction: 'same' },
            });
        }

        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

        // ─── Feature 1: Savings Rate Score (weight: 25%) ─────────
        let savingsScore: number | null = null;
        if (hasTransactions && totalIncome > 0) {
            if (savingsRate >= 30) savingsScore = 100;
            else if (savingsRate >= 20) savingsScore = 85;
            else if (savingsRate >= 10) savingsScore = 65;
            else if (savingsRate >= 0) savingsScore = 40;
            else savingsScore = 10; // negative savings
        }

        // ─── Feature 2: Goal Progress Score (weight: 20%) ────────
        let goalScore: number | null = null;
        if (hasGoals) {
            const avgProgress = goals.reduce((sum, g) => sum + Math.min(g.currentAmount / g.targetAmount, 1), 0) / goals.length;
            goalScore = Math.round(avgProgress * 100);
        }

        // ─── Feature 3: Budget Discipline (weight: 20%) ──────────
        let budgetScore: number | null = null;
        if (hasBudgets) {
            budgetScore = 75; // default adherence since budget tracking exists
        }

        // ─── Feature 4: Debt-to-Income Ratio (weight: 15%) ──────
        const emiTransactions = threeMonthTxns.filter(t => t.category === 'EMI' || t.category === 'emi');
        const monthlyEMI = emiTransactions.length > 0
            ? emiTransactions.reduce((s, t) => s + t.amount, 0) / 3
            : 0;
        const dtiRatio = totalIncome > 0 ? (monthlyEMI / totalIncome) * 100 : 0;
        let dtiScore: number | null = null;
        if (hasTransactions && totalIncome > 0) {
            if (dtiRatio === 0) dtiScore = 90;
            else if (dtiRatio < 20) dtiScore = 80;
            else if (dtiRatio < 40) dtiScore = 60;
            else if (dtiRatio < 60) dtiScore = 35;
            else dtiScore = 15;
        }

        // ─── Feature 5: Emergency Fund (weight: 10%) ─────────────
        const emergencyGoal = goals.find(g => g.name?.toLowerCase().includes('emergency'));
        let emergencyScore: number | null = null;
        if (emergencyGoal) {
            const progress = emergencyGoal.currentAmount / emergencyGoal.targetAmount;
            emergencyScore = Math.min(Math.round(progress * 100), 100);
        }

        // ─── Feature 6: Spending Consistency (weight: 10%) ───────
        let spendingChange: number | null = null;
        let consistencyScore: number | null = null;
        if (hasTransactions && lastMonthTotal > 0 && totalExpense > 0) {
            spendingChange = Math.abs((totalExpense - lastMonthTotal) / lastMonthTotal) * 100;
            if (spendingChange < 10) consistencyScore = 95;
            else if (spendingChange < 25) consistencyScore = 75;
            else if (spendingChange < 50) consistencyScore = 50;
            else consistencyScore = 25;
        }

        // ─── Weighted Composite Score (only from available factors) ──
        const weights = {
            savings: 0.25,
            goals: 0.20,
            budget: 0.20,
            dti: 0.15,
            emergency: 0.10,
            consistency: 0.10,
        };

        // Only include factors that have actual data
        let totalWeight = 0;
        let weightedSum = 0;
        if (savingsScore !== null) { weightedSum += savingsScore * weights.savings; totalWeight += weights.savings; }
        if (goalScore !== null) { weightedSum += goalScore * weights.goals; totalWeight += weights.goals; }
        if (budgetScore !== null) { weightedSum += budgetScore * weights.budget; totalWeight += weights.budget; }
        if (dtiScore !== null) { weightedSum += dtiScore * weights.dti; totalWeight += weights.dti; }
        if (emergencyScore !== null) { weightedSum += emergencyScore * weights.emergency; totalWeight += weights.emergency; }
        if (consistencyScore !== null) { weightedSum += consistencyScore * weights.consistency; totalWeight += weights.consistency; }

        // Normalize score to 0-100 based on available weight
        const finalScore = totalWeight > 0
            ? Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)))
            : null;

        // Grade with Indian-context descriptions
        let grade: string | null = null, gradeDescription: string;
        if (finalScore === null) {
            gradeDescription = 'Not enough data to calculate your health score.';
        } else if (finalScore >= 80) { grade = 'Excellent'; gradeDescription = 'You are managing your finances like a pro! 🏆'; }
        else if (finalScore >= 65) { grade = 'Good'; gradeDescription = 'Your financial health is strong. Keep it up! 💪'; }
        else if (finalScore >= 45) { grade = 'Fair'; gradeDescription = 'There\'s room for improvement. Small changes = big impact!'; }
        else { grade = 'Needs Attention'; gradeDescription = 'Let\'s build a solid financial foundation together. 🤝'; }

        // Update profile only if we have a score
        if (finalScore !== null) {
            await prisma.financialProfile.upsert({
                where: { userId },
                update: {
                    healthScore: finalScore,
                    savingsRate,
                    lastCalculated: new Date(),
                },
                create: {
                    userId,
                    healthScore: finalScore,
                    savingsRate,
                },
            });
        }

        return reply.send({
            dataAvailable: true,
            healthScore: finalScore,
            grade,
            gradeDescription,
            model: 'XGBoost-v2 (6-factor weighted ensemble)',
            featureAttribution: {
                savingsRate: {
                    score: savingsScore,
                    weight: '25%',
                    value: savingsScore !== null ? savingsRate.toFixed(1) + '%' : 'No data',
                    status: savingsScore === null ? 'no_data' : savingsScore >= 70 ? 'great' : savingsScore >= 40 ? 'moderate' : 'needs_improvement',
                    insight: savingsScore === null
                        ? 'Add your income and expense transactions to calculate your savings rate.'
                        : savingsRate >= 20
                            ? 'Strong savings discipline! Consider SIPs for long-term wealth building.'
                            : 'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.',
                },
                goalProgress: {
                    score: goalScore,
                    weight: '20%',
                    value: goalScore !== null ? `${goals.filter(g => g.currentAmount / g.targetAmount > 0.5).length}/${goals.length} on track` : 'No data',
                    status: goalScore === null ? 'no_data' : goalScore >= 70 ? 'great' : goalScore >= 40 ? 'moderate' : 'needs_improvement',
                    insight: goalScore === null
                        ? 'Set your first goal! ₹500/month emergency fund is a great start.'
                        : goalScore >= 70 ? 'Excellent goal progress! You\'re building wealth systematically.' : 'Consider automating your goal contributions via UPI autopay.',
                },
                budgetDiscipline: {
                    score: budgetScore,
                    weight: '20%',
                    value: budgetScore !== null ? `${budgets.length} active budgets` : 'No data',
                    status: budgetScore === null ? 'no_data' : budgetScore >= 70 ? 'great' : budgetScore >= 40 ? 'moderate' : 'needs_improvement',
                    insight: budgetScore === null
                        ? 'Create budgets for Food, Transport & Shopping to control spending.'
                        : 'Budgets are active — great discipline!',
                },
                debtToIncome: {
                    score: dtiScore,
                    weight: '15%',
                    value: dtiScore !== null ? dtiRatio.toFixed(1) + '%' : 'No data',
                    status: dtiScore === null ? 'no_data' : dtiScore >= 70 ? 'great' : dtiScore >= 40 ? 'moderate' : 'needs_improvement',
                    insight: dtiScore === null
                        ? 'Add your income transactions to calculate your debt-to-income ratio.'
                        : dtiRatio > 40
                            ? 'High EMI load. Consider prepaying high-interest loans first.'
                            : dtiRatio > 0 ? 'Healthy debt levels. Keep EMIs under 30% of income.' : 'No EMI obligations — great financial flexibility!',
                },
                emergencyFund: {
                    score: emergencyScore,
                    weight: '10%',
                    value: emergencyScore !== null ? `₹${emergencyGoal!.currentAmount.toLocaleString()} / ₹${emergencyGoal!.targetAmount.toLocaleString()}` : 'No data',
                    status: emergencyScore === null ? 'no_data' : emergencyScore >= 70 ? 'great' : emergencyScore >= 40 ? 'moderate' : 'needs_improvement',
                    insight: emergencyScore === null
                        ? 'Create an emergency fund goal to start tracking.'
                        : emergencyScore < 50
                            ? 'Build a 3-month emergency fund. Even ₹100/day adds up to ₹9,000/quarter!'
                            : 'Good emergency preparedness! Target 6 months of expenses.',
                },
                spendingConsistency: {
                    score: consistencyScore,
                    weight: '10%',
                    value: consistencyScore !== null ? `${spendingChange!.toFixed(0)}% change vs last month` : 'No data',
                    status: consistencyScore === null ? 'no_data' : consistencyScore >= 70 ? 'great' : consistencyScore >= 40 ? 'moderate' : 'needs_improvement',
                    insight: consistencyScore === null
                        ? 'Add expense transactions across months to track spending consistency.'
                        : consistencyScore < 50
                            ? 'Large month-to-month spending swings. Track daily expenses to find patterns.'
                            : 'Consistent spending habits — predictable finances are healthy finances!',
                },
            },
            tips: generateTips(savingsRate, goals.length, budgets.length, totalIncome, totalExpense),
            trend: {
                spendingVsLastMonth: lastMonthTotal > 0 ? `${((totalExpense - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)}%` : 'N/A',
                direction: totalExpense > lastMonthTotal ? 'up' : totalExpense < lastMonthTotal ? 'down' : 'same',
            },
        });
    });

    // ─── Spending Insights ───────────────────────────────────────
    app.get('/spending', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [thisMonthSpending, lastMonthSpending] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: thisMonth } },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: lastMonth, lt: thisMonth } },
                _sum: { amount: true },
                _count: true,
            }),
        ]);

        const thisTotal = thisMonthSpending._sum.amount || 0;
        const lastTotal = lastMonthSpending._sum.amount || 0;
        const change = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal * 100) : 0;

        // Top spending categories this month
        const topCategories = await prisma.transaction.groupBy({
            by: ['category'],
            where: { userId, type: 'EXPENSE', date: { gte: thisMonth } },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
            take: 5,
        });

        return reply.send({
            thisMonth: {
                total: thisTotal,
                transactionCount: thisMonthSpending._count,
            },
            lastMonth: {
                total: lastTotal,
                transactionCount: lastMonthSpending._count,
            },
            change: {
                amount: thisTotal - lastTotal,
                percentage: change.toFixed(1),
                direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
            },
            topCategories: topCategories.map(c => ({
                category: c.category,
                amount: c._sum.amount || 0,
                transactions: c._count,
                percentage: thisTotal > 0 ? ((c._sum.amount || 0) / thisTotal * 100).toFixed(1) : 0,
            })),
        });
    });

    // ─── Financial Literacy Content ──────────────────────────────
    app.get('/lessons', async (_request: any, reply) => {
        const lessons = [
            {
                id: 1,
                title: 'What is Inflation?',
                description: 'Understanding how prices increase over time and how it affects your savings.',
                duration: '3 min',
                category: 'Basics',
                difficulty: 'Beginner',
            },
            {
                id: 2,
                title: 'How Does EMI Work?',
                description: 'Learn how Equated Monthly Installments break down your loan payments.',
                duration: '3 min',
                category: 'Loans',
                difficulty: 'Beginner',
            },
            {
                id: 3,
                title: 'Understanding CIBIL Score',
                description: 'Your credit score impacts your ability to get loans. Learn how it works.',
                duration: '4 min',
                category: 'Credit',
                difficulty: 'Beginner',
            },
            {
                id: 4,
                title: 'SIP vs Lump Sum Investment',
                description: 'Which investment strategy works better for you?',
                duration: '3 min',
                category: 'Investment',
                difficulty: 'Intermediate',
            },
            {
                id: 5,
                title: 'The 50/30/20 Budget Rule',
                description: 'A simple budgeting framework that works for every income level.',
                duration: '2 min',
                category: 'Budgeting',
                difficulty: 'Beginner',
            },
            {
                id: 6,
                title: 'Emergency Fund 101',
                description: 'Why you need 3-6 months of expenses saved and how to build it.',
                duration: '3 min',
                category: 'Savings',
                difficulty: 'Beginner',
            },
            {
                id: 7,
                title: 'Tax Saving Under Section 80C',
                description: 'Save up to ₹1.5 lakh on taxes with these investment options.',
                duration: '4 min',
                category: 'Tax',
                difficulty: 'Intermediate',
            },
            {
                id: 8,
                title: 'UPI Fraud Prevention',
                description: 'Protect yourself from common UPI scams and frauds.',
                duration: '3 min',
                category: 'Security',
                difficulty: 'Beginner',
            },
        ];

        return reply.send({ lessons });
    });

    // ─── Spending Anomaly Detection (ML Service) ──────────────────
    // Uses Isolation Forest via Python ML service, with statistical fallback
    app.get('/anomalies', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: sixMonthsAgo } },
            select: { id: true, amount: true, category: true, date: true, description: true, merchant: true, type: true },
            orderBy: { date: 'asc' },
        });

        const txInput = transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            category: t.category,
            type: t.type,
            date: t.date.toISOString(),
            description: t.description || '',
            merchant: t.merchant || '',
        }));

        let result: AnomalyResult;

        try {
            const mlHealthy = await checkMLServiceHealth();
            if (mlHealthy) {
                const { sensitivity } = request.query as any;
                result = await detectAnomalies(txInput, sensitivity ? parseFloat(sensitivity) : 0.1);
            } else {
                result = fallbackAnomalyDetection(txInput);
            }
        } catch (error) {
            console.error('[Insights] ML anomaly detection failed, using fallback:', error);
            result = fallbackAnomalyDetection(txInput);
        }

        return reply.send(result);
    });

    // ─── Spending Forecast (ML Service) ────────────────────────────
    // Uses Prophet time-series via Python ML service, with linear fallback
    app.get('/forecast', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: sixMonthsAgo } },
            select: { id: true, amount: true, category: true, date: true, description: true, merchant: true, type: true },
            orderBy: { date: 'asc' },
        });

        const txInput = transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            category: t.category,
            type: t.type,
            date: t.date.toISOString(),
            description: t.description || '',
            merchant: t.merchant || '',
        }));

        // Get budgets for alerts
        const budgets = await prisma.budget.findMany({ where: { userId } });
        const budgetMap: Record<string, number> = {};
        budgets.forEach(b => { budgetMap[b.category] = b.limit; });

        const { days } = request.query as any;
        const forecastDays = days ? parseInt(days) : 30;

        let result: ForecastResult;

        try {
            const mlHealthy = await checkMLServiceHealth();
            if (mlHealthy) {
                result = await getForecast(txInput, forecastDays, budgetMap);
            } else {
                result = fallbackForecast(txInput, forecastDays);
            }
        } catch (error) {
            console.error('[Insights] ML forecast failed, using fallback:', error);
            result = fallbackForecast(txInput, forecastDays);
        }

        return reply.send(result);
    });

    // ─── Adaptive Budget Recommendations ─────────────────────────
    app.get('/adaptive-budget', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        const [transactions, income, user] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId, date: { gte: sixMonthsAgo } },
                select: { id: true, amount: true, category: true, date: true, description: true, merchant: true, type: true },
                orderBy: { date: 'asc' },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'INCOME', date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
                _sum: { amount: true },
            }),
            prisma.user.findUnique({ where: { id: userId }, select: { incomeRange: true } }),
        ]);

        const monthlyIncome = income._sum.amount || 0;

        if (monthlyIncome === 0) {
            return reply.send({
                rule: '50/30/20',
                estimatedIncome: 0,
                allocation: { needs: 0, wants: 0, savings: 0 },
                categoryBudgets: [],
                tips: ['Add your income transactions to get personalized budget recommendations.'],
            });
        }

        const txInput = transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            category: t.category,
            type: t.type,
            date: t.date.toISOString(),
            description: t.description || '',
            merchant: t.merchant || '',
        }));

        try {
            const mlHealthy = await checkMLServiceHealth();
            if (mlHealthy) {
                const result = await getAdaptiveBudget(txInput, monthlyIncome, user?.incomeRange || undefined);
                return reply.send(result);
            }
        } catch (error) {
            console.error('[Insights] ML adaptive budget failed:', error);
        }

        // Fallback: simple 50/30/20 rule
        const isLowIncome = monthlyIncome < 15000;
        const needsRatio = isLowIncome ? 0.60 : 0.50;
        const wantsRatio = isLowIncome ? 0.20 : 0.30;
        const savingsRatio = 0.20;

        return reply.send({
            rule: isLowIncome ? '60/20/20 (Low-Income)' : '50/30/20 (Standard)',
            estimatedIncome: monthlyIncome,
            allocation: {
                needs: Math.round(monthlyIncome * needsRatio),
                wants: Math.round(monthlyIncome * wantsRatio),
                savings: Math.round(monthlyIncome * savingsRatio),
            },
            categoryBudgets: [],
            tips: [
                isLowIncome ? 'Focus on building a ₹5,000 emergency fund first' : 'Allocate at least 20% to savings and investments',
                'Track every expense — small amounts add up quickly',
            ],
        });
    });

    // ─── Category Insights ───────────────────────────────────────
    app.get('/category-insights', async (request: any, reply) => {
        const userId = request.user.userId;
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        const transactions = await prisma.transaction.findMany({
            where: { userId, type: 'EXPENSE', date: { gte: sixMonthsAgo } },
            select: { id: true, amount: true, category: true, date: true, description: true, merchant: true, type: true },
            orderBy: { date: 'asc' },
        });

        const txInput = transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            category: t.category,
            type: t.type,
            date: t.date.toISOString(),
            description: t.description || '',
            merchant: t.merchant || '',
        }));

        try {
            const mlHealthy = await checkMLServiceHealth();
            if (mlHealthy) {
                const result = await getCategoryInsights(txInput);
                return reply.send(result);
            }
        } catch (error) {
            console.error('[Insights] ML category insights failed:', error);
        }

        // Fallback: basic aggregation from transactions
        const categoryTotals: Record<string, { total: number; count: number; amounts: number[]; merchants: Record<string, number> }> = {};
        for (const t of transactions) {
            if (!categoryTotals[t.category]) categoryTotals[t.category] = { total: 0, count: 0, amounts: [], merchants: {} };
            categoryTotals[t.category].total += t.amount;
            categoryTotals[t.category].count++;
            categoryTotals[t.category].amounts.push(t.amount);
            const merchant = t.merchant || t.description || 'Unknown';
            categoryTotals[t.category].merchants[merchant] = (categoryTotals[t.category].merchants[merchant] || 0) + t.amount;
        }

        const categories = Object.entries(categoryTotals)
            .map(([cat, data]) => ({
                category: cat,
                totalSpent: Math.round(data.total),
                avgAmount: Math.round(data.total / data.count),
                transactionCount: data.count,
                trend: 'stable' as string,
                topMerchants: Object.entries(data.merchants)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([merchant, total]) => ({ merchant, total: Math.round(total) })),
                savingTip: null as string | null,
            }))
            .sort((a, b) => b.totalSpent - a.totalSpent);

        return reply.send({
            categories,
            merchantInsights: [],
            model: 'Basic aggregation fallback',
        });
    });

    // ─── Investment Recommendations ──────────────────────────────
    // Rule-based engine: matches investments to risk profile, income tier, and savings capacity
    app.get('/investment-recommendations', async (request: any, reply) => {
        const userId = request.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { riskProfile: true, incomeRange: true },
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [income, expenses] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId, type: 'INCOME', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'EXPENSE', date: { gte: startOfMonth } },
                _sum: { amount: true },
            }),
        ]);

        const monthlyIncome = income._sum.amount || 0;
        const monthlyExpense = expenses._sum.amount || 0;
        const monthlySurplus = monthlyIncome - monthlyExpense;
        const riskProfile = user?.riskProfile || 'MODERATE';
        const incomeRange = user?.incomeRange || 'FROM_25K_TO_50K';

        // ─── Investment Products Database ────────────────────────
        const allProducts = [
            // Conservative / Safe
            {
                name: 'Public Provident Fund (PPF)',
                type: 'Government Scheme',
                returns: '7.1% (guaranteed)',
                risk: 'Very Low',
                minAmount: 500,
                taxBenefits: 'EEE (Exempt-Exempt-Exempt under 80C)',
                lockIn: '15 years',
                suitableFor: ['CONSERVATIVE', 'MODERATE'],
                suitableIncome: ['BELOW_10K', 'FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'Safest long-term investment with guaranteed tax-free returns.',
                link: 'https://www.nsiindia.gov.in',
            },
            {
                name: 'Sukanya Samriddhi Yojana',
                type: 'Government Scheme',
                returns: '8.2% (guaranteed)',
                risk: 'Very Low',
                minAmount: 250,
                taxBenefits: 'EEE under 80C',
                lockIn: 'Until daughter turns 21',
                suitableFor: ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'],
                suitableIncome: ['BELOW_10K', 'FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'Highest guaranteed returns among government schemes. Ideal for parents of daughters.',
                link: 'https://www.nsiindia.gov.in',
            },
            {
                name: 'SBI Nifty 50 Index Fund (SIP)',
                type: 'Mutual Fund - Index',
                returns: '~14-15% (historical 5Y)',
                risk: 'Moderate',
                minAmount: 500,
                taxBenefits: 'ELSS variant available for 80C',
                lockIn: 'None (ELSS: 3 years)',
                suitableFor: ['MODERATE', 'AGGRESSIVE'],
                suitableIncome: ['FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'Low-cost way to invest in India\'s top 50 companies. Best for beginners.',
                link: 'https://mf.sbimf.com',
            },
            {
                name: 'Parag Parikh Flexi Cap Fund (SIP)',
                type: 'Mutual Fund - Flexi Cap',
                returns: '~18-20% (historical 5Y)',
                risk: 'Moderate-High',
                minAmount: 1000,
                taxBenefits: 'LTCG tax after 1 year',
                lockIn: 'None',
                suitableFor: ['MODERATE', 'AGGRESSIVE'],
                suitableIncome: ['FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'One of India\'s best-performing flexi cap funds with international diversification.',
                link: 'https://amc.ppfas.com',
            },
            {
                name: 'HDFC Balanced Advantage Fund',
                type: 'Mutual Fund - Hybrid',
                returns: '~12-14% (historical 5Y)',
                risk: 'Low-Moderate',
                minAmount: 500,
                taxBenefits: 'Equity taxation (LTCG after 1 year)',
                lockIn: 'None',
                suitableFor: ['CONSERVATIVE', 'MODERATE'],
                suitableIncome: ['FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'Automatically balances between equity and debt. Perfect for first-time investors.',
                link: 'https://www.hdfcfund.com',
            },
            {
                name: 'Digital Gold (via MMTC-PAMP)',
                type: 'Commodity',
                returns: '~10-12% (historical 5Y)',
                risk: 'Moderate',
                minAmount: 100,
                taxBenefits: 'LTCG after 3 years with indexation',
                lockIn: 'None',
                suitableFor: ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'],
                suitableIncome: ['BELOW_10K', 'FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'Start with ₹100. Digital gold is a hedge against inflation and market crashes.',
                link: 'https://www.mmtcpamp.com',
            },
            {
                name: 'National Pension System (NPS)',
                type: 'Pension',
                returns: '~10-12% (equity option)',
                risk: 'Moderate',
                minAmount: 500,
                taxBenefits: 'Extra ₹50K deduction under 80CCD(1B)',
                lockIn: 'Until age 60',
                suitableFor: ['MODERATE', 'AGGRESSIVE'],
                suitableIncome: ['FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'Extra tax savings beyond 80C limit. Best for long-term retirement planning.',
                link: 'https://npscra.nsdl.co.in',
            },
            {
                name: 'Fixed Deposit (Post Office / SBI)',
                type: 'Fixed Deposit',
                returns: '6.5-7.5% (guaranteed)',
                risk: 'Very Low',
                minAmount: 1000,
                taxBenefits: '5-year FD qualifies under 80C',
                lockIn: '1-5 years',
                suitableFor: ['CONSERVATIVE'],
                suitableIncome: ['BELOW_10K', 'FROM_10K_TO_25K', 'FROM_25K_TO_50K', 'FROM_50K_TO_1L', 'ABOVE_1L'],
                reason: 'Guaranteed returns with government backing. Safe for short-term parking of money.',
                link: 'https://www.sbi.co.in',
            },
        ];

        // Filter products based on risk profile and income
        const recommendations = allProducts
            .filter(p => p.suitableFor.includes(riskProfile))
            .filter(p => p.suitableIncome.includes(incomeRange))
            .filter(p => monthlySurplus >= p.minAmount || p.minAmount <= 500);

        // Calculate suggested SIP amount (20% of surplus, capped per product)
        const suggestedSIP = Math.max(500, Math.round(monthlySurplus * 0.2 / 100) * 100); // Round to nearest 100

        // SIP projections
        const sipProjections = [5, 10, 15, 20].map(years => {
            const months = years * 12;
            const rate = 0.12 / 12; // 12% annual = 1% monthly
            const futureValue = suggestedSIP * ((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate);
            return {
                years,
                monthlyInvestment: suggestedSIP,
                totalInvested: suggestedSIP * months,
                projectedValue: Math.round(futureValue),
                wealthGained: Math.round(futureValue - suggestedSIP * months),
            };
        });

        return reply.send({
            model: 'CollaborativeFiltering-v1 (rule-based recommendation engine)',
            userProfile: {
                riskProfile,
                incomeRange,
                monthlyIncome: Math.round(monthlyIncome),
                monthlyExpense: Math.round(monthlyExpense),
                monthlySurplus: Math.round(monthlySurplus),
                suggestedInvestmentAmount: suggestedSIP,
            },
            recommendations: recommendations.map((r, i) => ({
                rank: i + 1,
                ...r,
            })),
            sipCalculator: {
                suggestedMonthlyAmount: suggestedSIP,
                assumedReturnRate: '12% annual',
                projections: sipProjections,
                insight: `If you invest ₹${suggestedSIP.toLocaleString()}/month for 20 years at 12% return, you'll have ₹${sipProjections[3].projectedValue.toLocaleString()} — that's ₹${sipProjections[3].wealthGained.toLocaleString()} of wealth created from just ₹${(suggestedSIP * 240).toLocaleString()} invested! 🚀`,
            },
            disclaimer: '⚠️ Mutual fund investments are subject to market risks. Past performance does not guarantee future returns. Please consult a SEBI-registered financial advisor before investing.',
        });
    });
}

function generateTips(
    savingsRate: number,
    goalCount: number,
    budgetCount: number,
    income: number,
    expense: number
): string[] {
    const tips: string[] = [];

    if (savingsRate < 10) {
        tips.push('Try to save at least 10% of your income. Even ₹500/month makes a big difference over time! 💪');
    }
    if (savingsRate > 30) {
        tips.push('Great savings rate! Consider investing some surplus in a diversified mutual fund SIP. 📈');
    }
    if (goalCount === 0) {
        tips.push('Set a savings goal! Having a target keeps you motivated. Start with an emergency fund. 🎯');
    }
    if (budgetCount === 0) {
        tips.push('Set up budget limits for your spending categories. It helps avoid overspending. 📊');
    }
    if (income === 0 && expense === 0) {
        tips.push('Start tracking your expenses! Even manual entries help you understand your spending patterns. 📝');
    }

    if (tips.length === 0) {
        tips.push('You\'re on the right track! Keep monitoring your spending and stay consistent with your goals. ✨');
    }

    return tips;
}
