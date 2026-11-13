// ─── ML Service Client ────────────────────────────────────────
// HTTP client for the Python FastAPI ML microservice.
// Provides anomaly detection, forecasting, adaptive budgeting,
// and category insights with fallback to legacy methods.

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 30_000;

interface TransactionInput {
    id: string;
    amount: number;
    category: string;
    type: string;
    date: string;
    description: string;
    merchant?: string;
}

// ─── Generic ML Service Caller ──────────────────────────────────
// Spending models must only ever see expenses. Income rows (salary etc.) are
// dropped here as well as inside the ML service itself.
function toMLExpenses(transactions: TransactionInput[]) {
    return transactions
        .filter(t => t.type === 'EXPENSE')
        .map(t => ({
            amount: t.amount,
            category: t.category,
            date: t.date.substring(0, 10),
            merchant: t.merchant || '',
            type: t.type,
        }));
}

async function callMLService<T>(endpoint: string, body: any): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`ML service error ${response.status}: ${err}`);
        }

        return await response.json() as T;
    } finally {
        clearTimeout(timer);
    }
}

// ─── Health Check ───────────────────────────────────────────────
export async function checkMLServiceHealth(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${ML_SERVICE_URL}/health`, { signal: controller.signal });
        clearTimeout(timer);
        return response.ok;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════
// 1. ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════
export interface AnomalyItem {
    category: string;
    amount: number;
    severity: string; // high, medium, low
    reason: string;
    description: string;
    avgSpending: number;
    deviation: number;
    date?: string;
    merchant?: string;
    suggestion: string;
}

export interface AnomalyResult {
    model: string;
    anomalies: AnomalyItem[];
    totalAnomalies: number;
}

export async function detectAnomalies(
    transactions: TransactionInput[],
    sensitivity: number = 0.1
): Promise<AnomalyResult> {
    const mlTxns = toMLExpenses(transactions);

    const raw = await callMLService<any>('/anomalies', { transactions: mlTxns });

    // Transform ML response → frontend-compatible shape
    const anomalies: AnomalyItem[] = [];

    // Category-level anomalies from Isolation Forest
    for (const a of (raw.anomalies || [])) {
        const severityMap: Record<string, string> = { critical: 'high', warning: 'medium' };
        anomalies.push({
            category: a.category,
            amount: a.currentSpend,
            severity: severityMap[a.severity] || 'low',
            reason: a.message || `${a.category} spending is ${a.multiplier}x above normal`,
            description: `Amount ₹${a.currentSpend?.toLocaleString('en-IN')} exceeds category average of ₹${a.averageSpend?.toLocaleString('en-IN')} by ${Math.round(((a.currentSpend - a.averageSpend) / (a.averageSpend || 1)) * 100)}%`,
            avgSpending: a.averageSpend,
            deviation: a.multiplier,
            suggestion: a.severity === 'critical'
                ? `Review your ${a.category} expenses and identify non-essential spending to cut back.`
                : `Monitor ${a.category} spending — it\'s trending higher than usual.`,
        });
    }

    // Large individual transactions
    for (const lt of (raw.largeTransactions || [])) {
        anomalies.push({
            category: lt.category || 'Other',
            amount: lt.amount,
            severity: lt.amount > 50000 ? 'high' : lt.amount > 10000 ? 'medium' : 'low',
            reason: lt.message || `Large expense of ₹${lt.amount?.toLocaleString('en-IN')}`,
            description: `Unusually large ${lt.category} transaction` + (lt.merchant ? ` at ${lt.merchant}` : ''),
            avgSpending: 0,
            deviation: 0,
            date: lt.date,
            merchant: lt.merchant,
            suggestion: `Check if this ₹${lt.amount?.toLocaleString('en-IN')} expense was planned or can be avoided next time.`,
        });
    }

    return {
        model: raw.model || 'IsolationForest-v2',
        anomalies,
        totalAnomalies: anomalies.length,
    };
}

// ═══════════════════════════════════════════════════════════════════
// 2. FORECASTING
// ═══════════════════════════════════════════════════════════════════
export interface ForecastResult {
    model: string;
    totalPredicted: number;
    dailyForecast: Array<{
        date: string;
        predicted: number;
        upper: number;
        lower: number;
        isActual?: boolean;
    }>;
    categoryForecasts: Array<{
        category: string;
        predicted: number;
        spentSoFar: number;
        dailyRate: number;
        trend: string;
    }>;
    budgetAlerts: Array<{
        category: string;
        budget: number;
        predicted: number;
        overshoot: number;
    }>;
    insight: string;
    currentMonth: any;
    projection: any;
    historicalAvg: number;
}

export async function getForecast(
    transactions: TransactionInput[],
    forecastDays: number = 30,
    budgets?: Record<string, number>
): Promise<ForecastResult> {
    const mlTxns = toMLExpenses(transactions);

    const budgetList = budgets
        ? Object.entries(budgets).map(([category, limit]) => ({ category, limit }))
        : [];

    const raw = await callMLService<any>('/forecast', { transactions: mlTxns, budgets: budgetList });

    // Transform daily forecast
    const dailyForecast = (raw.dailyForecast || []).map((d: any) => ({
        date: d.date,
        predicted: d.yhat || d.amount || 0,
        upper: d.yhat_upper || d.amount * 1.3 || 0,
        lower: d.yhat_lower || d.amount * 0.7 || 0,
        isActual: d.isActual || false,
    }));

    // Transform category forecasts
    const categoryForecasts = (raw.categoryForecasts || []).map((cf: any) => ({
        category: cf.category,
        predicted: cf.projectedTotal || 0,
        spentSoFar: cf.spentSoFar || 0,
        dailyRate: cf.dailyRate || 0,
        trend: cf.projectedTotal > cf.spentSoFar * 1.2 ? 'up' : cf.projectedTotal < cf.spentSoFar * 0.8 ? 'down' : 'stable',
    }));

    // Transform budget alerts
    const budgetAlerts = (raw.budgetAlerts || []).map((ba: any) => ({
        category: ba.category,
        budget: ba.budgetLimit,
        predicted: ba.projectedSpend,
        overshoot: ba.projectedOverage || (ba.projectedSpend - ba.budgetLimit),
    }));

    const totalPredicted = raw.projection?.projected || raw.currentMonth?.totalSpentSoFar || 0;

    return {
        model: raw.model || 'ML Forecast',
        totalPredicted,
        dailyForecast,
        categoryForecasts,
        budgetAlerts,
        insight: raw.insight || '',
        currentMonth: raw.currentMonth || {},
        projection: raw.projection || {},
        historicalAvg: raw.historicalAvg || 0,
    };
}

// ═══════════════════════════════════════════════════════════════════
// 3. ADAPTIVE BUDGET
// ═══════════════════════════════════════════════════════════════════
export interface AdaptiveBudgetResult {
    rule: string;
    estimatedIncome: number;
    allocation: { needs: number; wants: number; savings: number };
    categoryBudgets: Array<{
        category: string;
        budget: number;
        currentSpending: number;
        type: string;
    }>;
    tips: string[];
    recommended: any;
    actual: any;
}

function bucketBudget(ca: any, all: any[], recommended: any): number {
    const key = String(ca.bucket || '').toLowerCase(); // needs | wants | savings | other
    const bucketAmount = recommended?.[key]?.amount;
    if (!bucketAmount) return Math.round(ca.currentSpend || 0);
    const bucketSpend = all
        .filter(x => x.bucket === ca.bucket)
        .reduce((sum, x) => sum + (x.currentSpend || 0), 0);
    if (bucketSpend <= 0) return 0;
    return Math.round(bucketAmount * (ca.currentSpend || 0) / bucketSpend);
}

export async function getAdaptiveBudget(
    transactions: TransactionInput[],
    monthlyIncome: number,
    incomeRange?: string
): Promise<AdaptiveBudgetResult> {
    // Build currentSpending map from transactions (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentSpending: Record<string, number> = {};

    for (const t of transactions) {
        if (t.type === 'EXPENSE' && new Date(t.date) >= startOfMonth) {
            currentSpending[t.category] = (currentSpending[t.category] || 0) + t.amount;
        }
    }

    // Determine income range string
    const range = incomeRange || (
        monthlyIncome < 10000 ? 'BELOW_10K' :
        monthlyIncome < 25000 ? 'FROM_10K_TO_25K' :
        monthlyIncome < 50000 ? 'FROM_25K_TO_50K' :
        monthlyIncome < 100000 ? 'FROM_50K_TO_1L' : 'ABOVE_1L'
    );

    const raw = await callMLService<any>('/adaptive-budget', {
        incomeRange: range,
        monthlyIncome,
        currentSpending,
    });

    // Transform response
    const recommended = raw.recommended || {};
    const actual = raw.actual || {};

    return {
        rule: raw.rule || '50/30/20',
        estimatedIncome: raw.monthlyIncome || monthlyIncome,
        allocation: {
            needs: recommended.needs?.amount || Math.round(monthlyIncome * 0.5),
            wants: recommended.wants?.amount || Math.round(monthlyIncome * 0.3),
            savings: recommended.savings?.amount || Math.round(monthlyIncome * 0.2),
        },
        categoryBudgets: (raw.categoryAllocations || []).map((ca: any) => ({
            category: ca.category,
            // Split each bucket's recommended amount across its categories in
            // proportion to what the user currently spends on them.
            budget: bucketBudget(ca, raw.categoryAllocations || [], recommended),
            currentSpending: ca.currentSpend || 0,
            type: ca.bucket || 'Other',
        })),
        tips: raw.insights || [],
        recommended,
        actual,
    };
}

// ═══════════════════════════════════════════════════════════════════
// 4. CATEGORY INSIGHTS
// ═══════════════════════════════════════════════════════════════════
export interface CategoryInsightResult {
    categories: Array<{
        category: string;
        totalSpent: number;
        avgAmount: number;
        transactionCount: number;
        trend: string; // 'up' | 'down' | 'stable'
        topMerchants: Array<{ merchant: string; total: number }>;
        savingTip: string | null;
    }>;
    merchantInsights: any[];
    model: string;
}

export async function getCategoryInsights(
    transactions: TransactionInput[]
): Promise<CategoryInsightResult> {
    const mlTxns = toMLExpenses(transactions);

    const raw = await callMLService<any>('/category-insights', { transactions: mlTxns });

    // Transform categoryPatterns → categories array for frontend
    const catPatterns = raw.categoryPatterns || [];
    const merchantInsights = raw.merchantInsights || [];

    // Build top merchants per category from merchantInsights
    const merchantsByCategory: Record<string, Array<{ merchant: string; total: number }>> = {};
    for (const mi of merchantInsights) {
        const cat = mi.category || 'Other';
        if (!merchantsByCategory[cat]) merchantsByCategory[cat] = [];
        merchantsByCategory[cat].push({ merchant: mi.merchant, total: mi.totalSpent });
    }

    const categories = catPatterns.map((cp: any) => {
        const trendMap: Record<string, string> = { increasing: 'up', decreasing: 'down', stable: 'stable' };
        return {
            category: cp.category,
            totalSpent: cp.monthlyAverage * (cp.months || 1),
            avgAmount: cp.monthlyAverage,
            transactionCount: cp.totalTransactions || 0,
            trend: trendMap[cp.trend] || 'stable',
            topMerchants: (merchantsByCategory[cp.category] || []).slice(0, 3),
            savingTip: cp.trend === 'increasing'
                ? `Your ${cp.category} spending is rising. Consider setting a monthly budget.`
                : null,
        };
    });

    // Sort by totalSpent descending
    categories.sort((a: any, b: any) => b.totalSpent - a.totalSpent);

    return {
        categories,
        merchantInsights,
        model: raw.model || 'PatternDetection-v1',
    };
}

// ═══════════════════════════════════════════════════════════════════
// FALLBACK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════

// ─── Fallback: Simple Statistical Anomaly Detection ─────────────
export function fallbackAnomalyDetection(transactions: TransactionInput[]): AnomalyResult {
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const byCategory: Record<string, number[]> = {};

    for (const t of expenses) {
        if (!byCategory[t.category]) byCategory[t.category] = [];
        byCategory[t.category].push(t.amount);
    }

    const anomalies: AnomalyItem[] = [];

    for (const [category, amounts] of Object.entries(byCategory)) {
        const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / amounts.length;
        const std = Math.sqrt(variance);
        const threshold = mean + 2 * std;

        for (const t of expenses.filter(e => e.category === category)) {
            if (t.amount > threshold) {
                const deviation = Math.round(((t.amount - mean) / mean) * 100);
                anomalies.push({
                    category: t.category,
                    amount: t.amount,
                    severity: t.amount > mean + 3 * std ? 'high' : 'medium',
                    reason: `Amount ₹${t.amount.toLocaleString('en-IN')} exceeds category average of ₹${Math.round(mean).toLocaleString('en-IN')} by ${deviation}%`,
                    description: `Unusually high ${category} expense`,
                    avgSpending: Math.round(mean),
                    deviation: Math.round(t.amount / mean * 10) / 10,
                    date: t.date,
                    merchant: t.merchant,
                    suggestion: `Review your ${category} spending to identify savings opportunities.`,
                });
            }
        }
    }

    anomalies.sort((a, b) => b.amount - a.amount);

    return { model: 'Statistical fallback (mean + 2σ)', anomalies, totalAnomalies: anomalies.length };
}

// ─── Fallback: Simple Linear Forecast ───────────────────────────
// Used only when the ML service is unreachable. Projects the average spend
// per CALENDAR day (days with no spending count as zero) forward.
export function fallbackForecast(transactions: TransactionInput[], days: number = 30): ForecastResult {
    const expenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const today = new Date();
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    const spanDays = expenses.length > 0
        ? Math.max(1, Math.ceil((today.getTime() - new Date(expenses[0].date).getTime()) / 86400000))
        : 1;
    const avgDaily = total / spanDays;

    const forecast: ForecastResult['dailyForecast'] = [];
    for (let i = 1; i <= days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        forecast.push({
            date: date.toISOString().substring(0, 10),
            predicted: Math.round(avgDaily),
            lower: Math.round(avgDaily * 0.7),
            upper: Math.round(avgDaily * 1.3),
        });
    }

    // Category breakdown
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const catTotals: Record<string, { total: number; thisMonth: number }> = {};
    for (const t of expenses) {
        if (!catTotals[t.category]) catTotals[t.category] = { total: 0, thisMonth: 0 };
        catTotals[t.category].total += t.amount;
        if (new Date(t.date) >= startOfMonth) catTotals[t.category].thisMonth += t.amount;
    }

    const categoryForecasts: ForecastResult['categoryForecasts'] = [];
    for (const [cat, sums] of Object.entries(catTotals)) {
        const dailyRate = sums.total / spanDays;
        categoryForecasts.push({
            category: cat,
            predicted: Math.round(dailyRate * days),
            spentSoFar: Math.round(sums.thisMonth),
            dailyRate: Math.round(dailyRate),
            trend: 'stable',
        });
    }
    categoryForecasts.sort((a, b) => b.predicted - a.predicted);

    return {
        model: 'Linear projection fallback',
        totalPredicted: Math.round(avgDaily * days),
        dailyForecast: forecast,
        categoryForecasts,
        budgetAlerts: [],
        insight: `Based on your average daily spending of ₹${Math.round(avgDaily).toLocaleString('en-IN')}, you're projected to spend ₹${Math.round(avgDaily * days).toLocaleString('en-IN')} over the next ${days} days.`,
        currentMonth: {},
        projection: {},
        historicalAvg: Math.round(avgDaily * 30),
    };
}
