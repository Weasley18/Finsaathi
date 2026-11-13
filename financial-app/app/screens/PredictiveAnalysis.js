import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    TrendingUp, ShieldAlert, Wallet, PieChart as PieIcon,
    AlertTriangle, Lightbulb, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const { width } = Dimensions.get('window');

const SEVERITY_COLORS = { high: '#F44336', medium: '#FF9800', low: '#FFC107' };
const CATEGORY_COLORS = ['#00C853', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4', '#607D8B', '#8BC34A'];

const fmt = (v) => {
    if (v == null) return '—';
    return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export default function PredictiveAnalysis({ navigation }) {
    const [tab, setTab] = useState('anomalies');
    const [anomalies, setAnomalies] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [budget, setBudget] = useState(null);
    const [catInsights, setCatInsights] = useState(null);
    const [loading, setLoading] = useState({});
    const [expandedAnomaly, setExpandedAnomaly] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (key, fn, setter) => {
        setLoading(p => ({ ...p, [key]: true }));
        try {
            const res = await fn();
            setter(res.data || res);
        } catch (e) {
            console.error(`Failed to load ${key}:`, e);
        } finally {
            setLoading(p => ({ ...p, [key]: false }));
        }
    };

    const loadAll = useCallback(() => {
        load('anomalies', () => api.getAnomalies(), setAnomalies);
        load('forecast', () => api.getForecast(30), setForecast);
        load('budget', () => api.getAdaptiveBudget(), setBudget);
        load('insights', () => api.getCategoryInsights(), setCatInsights);
    }, []);

    useEffect(() => { loadAll(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const tabs = [
        { key: 'anomalies', icon: ShieldAlert, label: 'Anomalies' },
        { key: 'forecast', icon: TrendingUp, label: 'Forecast' },
        { key: 'budget', icon: Wallet, label: 'Budget' },
        { key: 'insights', icon: PieIcon, label: 'Insights' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

            <View style={styles.content}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brightGold} />}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TrendingUp size={22} color={colors.accent} />
                        <Text style={styles.headerTitle}>Predictive Analysis</Text>
                    </View>
                    <Text style={styles.subHeader}>AI-powered spending anomalies, forecasts & budgets</Text>

                    {/* Tab Bar */}
                    <View style={styles.tabBar}>
                        {tabs.map(t => {
                            const Icon = t.icon;
                            const isActive = tab === t.key;
                            return (
                                <TouchableOpacity
                                    key={t.key}
                                    onPress={() => setTab(t.key)}
                                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                                >
                                    <Icon size={14} color={isActive ? '#000' : colors.textSecondary} />
                                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* ─── Anomalies Tab ─── */}
                    {tab === 'anomalies' && (
                        <View>
                            {loading.anomalies ? (
                                <View style={styles.loadingCard}>
                                    <ActivityIndicator color={colors.accent} />
                                    <Text style={styles.loadingText}>Detecting anomalies...</Text>
                                </View>
                            ) : !anomalies?.anomalies?.length ? (
                                <View style={styles.emptyCard}>
                                    <ShieldAlert size={40} color="#4CAF50" />
                                    <Text style={styles.emptyTitle}>No anomalies detected</Text>
                                    <Text style={styles.emptySubtitle}>Your spending patterns look normal!</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Severity Summary */}
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                        {['high', 'medium', 'low'].map(sev => {
                                            const count = anomalies.anomalies.filter(a => a.severity === sev).length;
                                            if (!count) return null;
                                            return (
                                                <View key={sev} style={[styles.severityCard, { borderLeftColor: SEVERITY_COLORS[sev] }]}>
                                                    <Text style={styles.severityCount}>{count}</Text>
                                                    <Text style={styles.severityLabel}>{sev} severity</Text>
                                                </View>
                                            );
                                        })}
                                    </ScrollView>

                                    {/* Anomaly List */}
                                    {anomalies.anomalies.map((a, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.anomalyCard}
                                            onPress={() => setExpandedAnomaly(expandedAnomaly === i ? null : i)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.anomalyRow}>
                                                <AlertTriangle size={16} color={SEVERITY_COLORS[a.severity] || '#FF9800'} />
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={styles.anomalyCategory}>{a.category || a.merchant || 'Unknown'}</Text>
                                                    <Text style={styles.anomalyReason} numberOfLines={1}>{a.reason || a.description}</Text>
                                                </View>
                                                <Text style={styles.anomalyAmount}>{fmt(a.amount)}</Text>
                                                <View style={[styles.severityBadge, { backgroundColor: `${SEVERITY_COLORS[a.severity]}22` }]}>
                                                    <Text style={[styles.severityBadgeText, { color: SEVERITY_COLORS[a.severity] }]}>{a.severity}</Text>
                                                </View>
                                                {expandedAnomaly === i ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
                                            </View>
                                            {expandedAnomaly === i && (
                                                <View style={styles.anomalyDetail}>
                                                    {a.avgSpending != null && <Text style={styles.detailText}>Avg category spending: {fmt(a.avgSpending)}</Text>}
                                                    {a.deviation != null && <Text style={styles.detailText}>Deviation: {a.deviation}x normal</Text>}
                                                    {a.date && <Text style={styles.detailText}>Date: {new Date(a.date).toLocaleDateString('en-IN')}</Text>}
                                                    {a.suggestion && (
                                                        <View style={styles.suggestionRow}>
                                                            <Lightbulb size={12} color={colors.accent} />
                                                            <Text style={styles.suggestionText}>{a.suggestion}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </View>
                    )}

                    {/* ─── Forecast Tab ─── */}
                    {tab === 'forecast' && (
                        <View>
                            {loading.forecast ? (
                                <View style={styles.loadingCard}>
                                    <ActivityIndicator color={colors.accent} />
                                    <Text style={styles.loadingText}>Generating forecast...</Text>
                                </View>
                            ) : !forecast ? (
                                <View style={styles.emptyCard}>
                                    <TrendingUp size={40} color={colors.textMuted} />
                                    <Text style={styles.emptyTitle}>No forecast data</Text>
                                    <Text style={styles.emptySubtitle}>Add more transactions for predictions</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Summary Cards */}
                                    <View style={styles.summaryRow}>
                                        <View style={[styles.summaryCard, glassmorphism.card]}>
                                            <Text style={styles.summaryLabel}>Predicted Spend (30d)</Text>
                                            <Text style={styles.summaryValue}>{fmt(forecast.summary?.totalPredicted || forecast.totalPredicted)}</Text>
                                        </View>
                                        {forecast.budgetAlerts?.length > 0 && (
                                            <View style={[styles.summaryCard, glassmorphism.card, { borderLeftWidth: 3, borderLeftColor: '#F44336' }]}>
                                                <Text style={styles.summaryLabel}>Budget Alerts</Text>
                                                <Text style={[styles.summaryValue, { color: '#F44336' }]}>{forecast.budgetAlerts.length}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Category Forecasts */}
                                    {forecast.categoryForecasts?.length > 0 && (
                                        <View style={{ marginTop: 16 }}>
                                            <Text style={styles.sectionTitle}>Category Forecasts</Text>
                                            {forecast.categoryForecasts.map((cf, i) => (
                                                <View key={cf.category} style={[styles.categoryCard, { borderLeftColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]}>
                                                    <Text style={styles.categoryName}>{cf.category}</Text>
                                                    <Text style={styles.categoryAmount}>{fmt(cf.predicted)}</Text>
                                                    {cf.trend && (
                                                        <View style={styles.trendRow}>
                                                            {cf.trend === 'up' ? <ArrowUp size={12} color="#F44336" /> : <ArrowDown size={12} color="#4CAF50" />}
                                                            <Text style={[styles.trendText, { color: cf.trend === 'up' ? '#F44336' : '#4CAF50' }]}>
                                                                {cf.trend === 'up' ? 'Increasing' : 'Decreasing'} trend
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Budget Alerts */}
                                    {forecast.budgetAlerts?.length > 0 && (
                                        <View style={{ marginTop: 16 }}>
                                            <Text style={styles.sectionTitle}>Budget Alerts</Text>
                                            {forecast.budgetAlerts.map((alert, i) => (
                                                <View key={i} style={[styles.alertCard, glassmorphism.card]}>
                                                    <Text style={styles.alertCategory}>{alert.category}</Text>
                                                    <Text style={styles.alertDetail}>
                                                        Budget: {fmt(alert.budget)} · Predicted: {fmt(alert.predicted)} · Overshoot: {fmt(alert.overshoot)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {/* ─── Smart Budget Tab ─── */}
                    {tab === 'budget' && (
                        <View>
                            {loading.budget ? (
                                <View style={styles.loadingCard}>
                                    <ActivityIndicator color={colors.accent} />
                                    <Text style={styles.loadingText}>Calculating smart budget...</Text>
                                </View>
                            ) : !budget ? (
                                <View style={styles.emptyCard}>
                                    <Wallet size={40} color={colors.textMuted} />
                                    <Text style={styles.emptyTitle}>No budget data</Text>
                                    <Text style={styles.emptySubtitle}>No budget recommendations available yet</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Rule Info */}
                                    {budget.rule && (
                                        <View style={[styles.ruleCard, glassmorphism.card]}>
                                            <Text style={styles.ruleName}>{budget.rule} Rule</Text>
                                            <Text style={styles.ruleIncome}>Estimated Monthly Income: {fmt(budget.estimatedIncome)}</Text>
                                        </View>
                                    )}

                                    {/* Allocation */}
                                    {budget.allocation && (
                                        <View style={styles.allocationRow}>
                                            {Object.entries(budget.allocation).map(([key, val]) => {
                                                const allocationColors = { needs: '#2196F3', wants: '#FF9800', savings: '#4CAF50' };
                                                return (
                                                    <View key={key} style={[styles.allocationCard, glassmorphism.card]}>
                                                        <Text style={styles.allocationLabel}>{key}</Text>
                                                        <Text style={[styles.allocationValue, { color: allocationColors[key] || colors.textPrimary }]}>
                                                            {fmt(val)}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* Category Budgets */}
                                    {budget.categoryBudgets?.length > 0 && (
                                        <View style={{ marginTop: 16 }}>
                                            <Text style={styles.sectionTitle}>Category-wise Budget</Text>
                                            {budget.categoryBudgets.map((cb, i) => {
                                                const pct = cb.budget > 0 ? Math.min(100, Math.round((cb.currentSpending / cb.budget) * 100)) : 0;
                                                const over = pct > 90;
                                                return (
                                                    <View key={cb.category} style={{ marginBottom: 14 }}>
                                                        <View style={styles.budgetHeader}>
                                                            <Text style={styles.budgetCategory}>
                                                                {cb.category} <Text style={styles.budgetType}>{cb.type}</Text>
                                                            </Text>
                                                            <Text style={[styles.budgetAmount, over && { color: '#F44336' }]}>
                                                                {fmt(cb.currentSpending)} / {fmt(cb.budget)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.progressBg}>
                                                            <View style={[
                                                                styles.progressFill,
                                                                {
                                                                    width: `${pct}%`,
                                                                    backgroundColor: over ? '#F44336' : pct > 70 ? '#FF9800' : CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                                                },
                                                            ]} />
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* Recommended Budgets (fallback) */}
                                    {budget.recommended_budgets && !budget.categoryBudgets && (
                                        <View style={{ marginTop: 16 }}>
                                            <Text style={styles.sectionTitle}>Recommended Budget</Text>
                                            {Object.entries(budget.recommended_budgets).map(([key, val]) => (
                                                <View key={key} style={[styles.categoryCard, { borderLeftColor: colors.accent }]}>
                                                    <Text style={styles.categoryName}>{key}</Text>
                                                    <Text style={styles.categoryAmount}>{fmt(val?.amount)}</Text>
                                                    {val?.percentage_of_income && (
                                                        <Text style={styles.trendTextMuted}>{val.percentage_of_income}% of income</Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Tips */}
                                    {budget.tips?.length > 0 && (
                                        <View style={{ marginTop: 16 }}>
                                            <Text style={styles.sectionTitle}>Savings Tips</Text>
                                            {budget.tips.map((tip, i) => (
                                                <View key={i} style={[styles.tipCard, glassmorphism.card]}>
                                                    <Lightbulb size={14} color="#FF9800" />
                                                    <Text style={styles.tipText}>{tip}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {/* ─── Category Insights Tab ─── */}
                    {tab === 'insights' && (
                        <View>
                            {loading.insights ? (
                                <View style={styles.loadingCard}>
                                    <ActivityIndicator color={colors.accent} />
                                    <Text style={styles.loadingText}>Analyzing categories...</Text>
                                </View>
                            ) : !catInsights?.categories?.length && !catInsights?.insights ? (
                                <View style={styles.emptyCard}>
                                    <PieIcon size={40} color={colors.textMuted} />
                                    <Text style={styles.emptyTitle}>No category insights</Text>
                                    <Text style={styles.emptySubtitle}>Add more transactions for analysis</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Categories from ML */}
                                    {catInsights?.categories?.map((cat, i) => (
                                        <View key={cat.category} style={[styles.insightCard, { borderLeftColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]}>
                                            <Text style={styles.insightCategory}>{cat.category}</Text>
                                            <View style={styles.insightGrid}>
                                                <View style={styles.insightItem}>
                                                    <Text style={styles.insightLabel}>Total</Text>
                                                    <Text style={styles.insightValue}>{fmt(cat.totalSpent)}</Text>
                                                </View>
                                                <View style={styles.insightItem}>
                                                    <Text style={styles.insightLabel}>Avg/txn</Text>
                                                    <Text style={styles.insightValue}>{fmt(cat.avgAmount)}</Text>
                                                </View>
                                                <View style={styles.insightItem}>
                                                    <Text style={styles.insightLabel}>Count</Text>
                                                    <Text style={styles.insightValue}>{cat.transactionCount}</Text>
                                                </View>
                                                {cat.trend && (
                                                    <View style={styles.insightItem}>
                                                        <Text style={styles.insightLabel}>Trend</Text>
                                                        <Text style={[styles.insightValue, { color: cat.trend === 'up' ? '#F44336' : '#4CAF50' }]}>
                                                            {cat.trend === 'up' ? '↑ Rising' : '↓ Falling'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            {cat.topMerchants?.length > 0 && (
                                                <View style={styles.merchantRow}>
                                                    <Text style={styles.merchantLabel}>Top merchants:</Text>
                                                    <View style={styles.merchantChips}>
                                                        {cat.topMerchants.slice(0, 3).map((m, j) => (
                                                            <View key={j} style={styles.merchantChip}>
                                                                <Text style={styles.merchantChipText}>{m.merchant || m}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )}
                                            {cat.savingTip && (
                                                <View style={styles.savingTipRow}>
                                                    <Lightbulb size={12} color={colors.accent} />
                                                    <Text style={styles.savingTipText}>{cat.savingTip}</Text>
                                                </View>
                                            )}
                                        </View>
                                    ))}

                                    {/* Fallback insights */}
                                    {catInsights?.insights && !catInsights?.categories && (
                                        Object.entries(catInsights.insights).map(([cat, data], i) => (
                                            <View key={cat} style={[styles.insightCard, { borderLeftColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]}>
                                                <Text style={styles.insightCategory}>{cat}</Text>
                                                <View style={styles.insightGrid}>
                                                    <View style={styles.insightItem}>
                                                        <Text style={styles.insightLabel}>Total</Text>
                                                        <Text style={styles.insightValue}>{fmt(data.total_spent)}</Text>
                                                    </View>
                                                    <View style={styles.insightItem}>
                                                        <Text style={styles.insightLabel}>Avg/txn</Text>
                                                        <Text style={styles.insightValue}>{fmt(data.avg_transaction)}</Text>
                                                    </View>
                                                    <View style={styles.insightItem}>
                                                        <Text style={styles.insightLabel}>Count</Text>
                                                        <Text style={styles.insightValue}>{data.transaction_count}</Text>
                                                    </View>
                                                    <View style={styles.insightItem}>
                                                        <Text style={styles.insightLabel}>Share</Text>
                                                        <Text style={styles.insightValue}>{data.percentage_of_total}%</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
                <BottomNav />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content: { flex: 1 },
    scrollContent: { padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
    subHeader: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, marginTop: 4 },
    tabBar: {
        flexDirection: 'row', gap: 4, marginBottom: 24,
        backgroundColor: colors.cardBg, borderRadius: 10, padding: 4,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: 10, borderRadius: 8,
    },
    tabBtnActive: { backgroundColor: colors.accent },
    tabLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    tabLabelActive: { color: '#000' },
    loadingCard: {
        ...glassmorphism.card, padding: 48, alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    loadingText: { color: colors.textMuted, fontSize: 13 },
    emptyCard: {
        ...glassmorphism.card, padding: 48, alignItems: 'center', gap: 12,
    },
    emptyTitle: { fontWeight: '600', color: colors.textPrimary, fontSize: 16 },
    emptySubtitle: { color: colors.textMuted, fontSize: 13 },
    severityCard: {
        ...glassmorphism.card, padding: 16, marginRight: 12, borderLeftWidth: 4, minWidth: 120,
    },
    severityCount: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
    severityLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
    anomalyCard: {
        ...glassmorphism.card, padding: 16, marginBottom: 10,
    },
    anomalyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    anomalyCategory: { fontWeight: '600', fontSize: 14, color: colors.textPrimary },
    anomalyReason: { fontSize: 12, color: colors.textMuted },
    anomalyAmount: { fontWeight: '700', fontSize: 15, color: colors.textPrimary, marginRight: 8 },
    severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 4 },
    severityBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
    anomalyDetail: {
        marginTop: 12, padding: 12, borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    detailText: { fontSize: 13, color: colors.textSecondary, marginBottom: 4, lineHeight: 18 },
    suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
    suggestionText: { color: colors.accent, fontSize: 13, flex: 1 },
    summaryRow: { flexDirection: 'row', gap: 12 },
    summaryCard: { flex: 1, padding: 16 },
    summaryLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
    summaryValue: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
    categoryCard: {
        ...glassmorphism.card, padding: 14, marginBottom: 10, borderLeftWidth: 4,
    },
    categoryName: { fontWeight: '600', fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
    categoryAmount: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    trendText: { fontSize: 12, fontWeight: '600' },
    trendTextMuted: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    alertCard: { padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#F44336' },
    alertCategory: { fontWeight: '600', fontSize: 14, color: colors.textPrimary },
    alertDetail: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    ruleCard: { padding: 20, marginBottom: 16 },
    ruleName: { fontWeight: '700', fontSize: 18, color: colors.textPrimary, marginBottom: 4 },
    ruleIncome: { fontSize: 13, color: colors.textSecondary },
    allocationRow: { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
    allocationCard: { flex: 1, padding: 16, alignItems: 'center', minWidth: 90 },
    allocationLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize', marginBottom: 4 },
    allocationValue: { fontSize: 20, fontWeight: '700' },
    budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    budgetCategory: { fontWeight: '600', fontSize: 14, color: colors.textPrimary },
    budgetType: { fontSize: 11, color: colors.textMuted },
    budgetAmount: { fontSize: 13, color: colors.textMuted },
    progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginBottom: 8 },
    tipText: { flex: 1, fontSize: 14, color: colors.textSecondary },
    insightCard: {
        ...glassmorphism.card, padding: 18, marginBottom: 12, borderLeftWidth: 4,
    },
    insightCategory: { fontWeight: '700', fontSize: 15, color: colors.textPrimary, marginBottom: 8 },
    insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    insightItem: { width: '45%' },
    insightLabel: { fontSize: 12, color: colors.textMuted },
    insightValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    merchantRow: { marginTop: 10 },
    merchantLabel: { fontSize: 12, color: colors.textMuted },
    merchantChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
    merchantChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
    merchantChipText: { fontSize: 11, color: colors.textSecondary },
    savingTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 10 },
    savingTipText: { flex: 1, fontSize: 12, color: colors.accent },
});
