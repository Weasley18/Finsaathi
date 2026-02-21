import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingDown, TrendingUp, Zap, ShoppingBag, Lightbulb, Sparkles, Target, CreditCard, PiggyBank, BookOpen, Heart, ArrowUpRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from '../components/BottomNav';
import useFinanceStore from '../store/financeStore';
import useAuthStore from '../store/authStore';
import { colors, gradients, glassmorphism } from '../theme';

const { width } = Dimensions.get('window');

const formatCurrency = (amount) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount?.toFixed(0) || 0}`;
};

const formatAmount = (amount) => {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
};

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

const CATEGORY_ICONS = {
  Food: { icon: ShoppingBag, bg: '#332a00' },
  Transport: { icon: CreditCard, bg: '#1a2533' },
  Shopping: { icon: ShoppingBag, bg: '#2a1a33' },
  Bills: { icon: Lightbulb, bg: '#1a3320' },
  Health: { icon: Heart, bg: '#331a1a' },
  Education: { icon: BookOpen, bg: '#1a2a33' },
  Entertainment: { icon: Sparkles, bg: '#33291a' },
  EMI: { icon: CreditCard, bg: '#331a22' },
  Salary: { icon: TrendingUp, bg: '#1a3320' },
};

export default function Dashboard({ navigation }) {
  const { dashboard, dashboardLoading, fetchDashboard } = useFinanceStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    const { token, user: authUser } = useAuthStore.getState();
    if (token && authUser) {
      console.log('[Dashboard] Fetching data for', authUser.phone);
      fetchDashboard();
    } else {
      console.log('[Dashboard] Waiting for auth...');
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, []);

  const userName = dashboard?.user?.name || user?.name || 'there';
  const spending = dashboard?.summary?.totalExpenses || 0;
  const income = dashboard?.summary?.totalIncome || 0;
  const savings = dashboard?.summary?.savings || 0;
  const healthScore = dashboard?.summary?.healthScore || 50;
  const recentTransactions = dashboard?.recentTransactions || [];
  const goals = dashboard?.goals || [];
  const categorySpending = dashboard?.categorySpending || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brightGold} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
            <Text style={styles.userName}>Namaste, {userName}</Text>
          </View>

          {/* AI Advisor Welcome Chat Bubble */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AIChat')}
            style={styles.aiWelcomeBubble}
          >
            <View style={styles.aiWelcomeHeader}>
              <View style={styles.aiAvatar}>
                <Sparkles size={16} color={colors.accentLight} />
              </View>
              <Text style={styles.aiWelcomeName}>FinSaathi AI Advisor</Text>
            </View>
            <Text style={styles.aiWelcomeText}>
              Welcome, {userName}! 🎉 {healthScore >= 70
                ? "Great financial health! Let's optimize further."
                : healthScore >= 50
                  ? "You're on a solid track. Let me help you save more!"
                  : "Let's work together to build your financial strength! 💪"}
            </Text>
            <Text style={styles.aiWelcomeTap}>Tap to chat with your advisor →</Text>
          </TouchableOpacity>

          {/* Spending & Income Cards */}
          <View style={styles.summaryRow}>
            <LinearGradient colors={gradients.surfaceCard} style={[styles.summaryCard, glassmorphism.card]}>
              <Text style={styles.cardLabel}>Spending</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(spending)}</Text>
              <View style={styles.trendBadge}>
                <TrendingDown size={12} color={colors.successLight} />
                <Text style={styles.trendText}>this month</Text>
              </View>
            </LinearGradient>

            <LinearGradient colors={gradients.surfaceCard} style={[styles.summaryCard, glassmorphism.card]}>
              <Text style={styles.cardLabel}>Income</Text>
              <Text style={[styles.summaryAmount, { color: colors.successLight }]}>{formatCurrency(income)}</Text>
              <View style={styles.trendBadge}>
                <TrendingUp size={12} color={colors.successLight} />
                <Text style={styles.trendText}>this month</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Health Score Badge */}
          <LinearGradient colors={gradients.surfaceCard} style={[styles.healthCard, glassmorphism.card]}>
            <View style={styles.healthRow}>
              <View>
                <Text style={styles.cardLabel}>Financial Health</Text>
                <Text style={styles.healthGrade}>
                  {healthScore >= 80 ? 'Excellent ✨' : healthScore >= 60 ? 'Good 👍' : healthScore >= 40 ? 'Fair 📊' : 'Needs Attention 💪'}
                </Text>
              </View>
              <View style={styles.healthScoreBadge}>
                <Text style={styles.healthScoreText}>{healthScore}</Text>
              </View>
            </View>
            <View style={styles.healthBar}>
              <LinearGradient
                colors={healthScore >= 60 ? ['#4caf50', '#8bc34a'] : ['#ff9800', '#f44336']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.healthBarFill, { width: `${Math.min(healthScore, 100)}%` }]}
              />
            </View>
          </LinearGradient>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ExpenseEntry')}>
              <LinearGradient colors={[colors.accent, colors.accentLight]} style={styles.actionIcon}>
                <ShoppingBag size={20} color="#000" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AIChat')}>
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceLight }]}>
                <Zap size={20} color={colors.accent} />
              </View>
              <Text style={styles.actionLabel}>Ask AI</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('SavingsGoals')}>
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceLight }]}>
                <Target size={20} color={colors.accent} />
              </View>
              <Text style={styles.actionLabel}>Goals</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DiscoverMarketplace')}>
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceLight }]}>
                <ShoppingBag size={20} color={colors.accent} />
              </View>
              <Text style={styles.actionLabel}>Discover</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Top Goal Preview */}
          {goals.length > 0 && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('SavingsGoals')}>
              <LinearGradient colors={gradients.surfaceCard} style={[styles.goalCard, glassmorphism.cardElevated]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{goals[0].name}</Text>
                  <PiggyBank size={20} color={colors.accent} />
                </View>
                <View style={styles.goalRow}>
                  <Text style={styles.goalAmount}>{formatAmount(goals[0].currentAmount)}</Text>
                  <Text style={styles.goalTarget}> / {formatAmount(goals[0].targetAmount)}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={gradients.goldAccent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${Math.min((goals[0].currentAmount / goals[0].targetAmount) * 100, 100)}%` }]}
                  />
                </View>
                <Text style={styles.goalProgress}>
                  {((goals[0].currentAmount / goals[0].targetAmount) * 100).toFixed(0)}% complete
                  {goals.length > 1 ? ` • ${goals.length - 1} more goals` : ''}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* AI Insight */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Zap size={20} color={colors.accent} />
              <Text style={styles.insightTitle}>FinSaathi AI Insight</Text>
            </View>
            <Text style={styles.insightText}>
              {savings > 0
                ? `You've saved ${formatCurrency(savings)} this month! ${goals.length > 0 ? `Should we move it to your "${goals[0].name}" goal?` : 'Consider setting up a savings goal!'}`
                : spending > income
                  ? `You're spending ₹${(spending - income).toLocaleString('en-IN')} more than you earn this month. Let me help you cut costs! 💡`
                  : 'Start tracking your expenses to get personalized insights! 📊'}
            </Text>
          </View>

          {/* Recent Transactions */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SpendingReport')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {dashboardLoading && recentTransactions.length === 0 ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.transactionList}>
              {recentTransactions.slice(0, 5).map((t, index) => {
                const cat = CATEGORY_ICONS[t.category] || CATEGORY_ICONS.Food;
                const IconComponent = cat.icon;
                const isExpense = t.type === 'EXPENSE';
                const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                return (
                  <View key={t.id || index} style={styles.transactionItem}>
                    <View style={[styles.iconBox, { backgroundColor: cat.bg }]}>
                      <IconComponent size={22} color={colors.accent} />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionName}>{t.merchant || t.category}</Text>
                      <Text style={styles.transactionTime}>{dateStr} • {t.category}</Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: isExpense ? '#ff6b6b' : colors.successLight }]}>
                      {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                    </Text>
                  </View>
                );
              })}

              {recentTransactions.length === 0 && !dashboardLoading && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No transactions yet</Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => navigation.navigate('ExpenseEntry')}
                  >
                    <Text style={styles.emptyButtonText}>Add Your First Expense</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Spacer for BottomNav */}
          <View style={{ height: 100 }} />
        </ScrollView>

        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
  },
  content: { flex: 1 },
  scrollContent: { padding: 24 },
  header: { marginTop: 10, marginBottom: 24 },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.brightGold,
    letterSpacing: 0.5,
  },
  // AI Welcome
  aiWelcomeBubble: {
    ...glassmorphism.card,
    borderColor: 'rgba(186,143,13,0.4)',
    borderTopLeftRadius: 4,
    padding: 20,
    marginBottom: 24,
  },
  aiWelcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(186,143,13,0.2)',
    borderWidth: 1, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  aiWelcomeName: {
    fontSize: 14, fontWeight: '700', color: colors.accent,
    letterSpacing: 0.5,
  },
  aiWelcomeText: {
    fontSize: 15, color: colors.textPrimary, lineHeight: 22, marginBottom: 8,
  },
  aiWelcomeTap: {
    fontSize: 12, color: colors.accent, fontWeight: '600', opacity: 0.7,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
  },
  cardLabel: {
    fontSize: 12, color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6,
  },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center',
  },
  trendText: {
    color: colors.textMuted, fontSize: 11, marginLeft: 4,
  },
  // Health
  healthCard: {
    padding: 16,
    marginBottom: 24,
  },
  healthRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  healthGrade: {
    fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 4,
  },
  healthScoreBadge: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: colors.brightGold,
    alignItems: 'center', justifyContent: 'center',
  },
  healthScoreText: {
    fontSize: 20, fontWeight: 'bold', color: colors.brightGold,
  },
  healthBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%', borderRadius: 3,
  },
  // Quick Actions
  sectionTitle: {
    fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionBtn: {
    alignItems: 'center', marginRight: 20,
  },
  actionIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionLabel: {
    color: colors.textSecondary, fontSize: 12,
  },
  // Goal Card
  goalCard: {
    padding: 20, marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14, color: colors.textSecondary,
  },
  goalRow: {
    flexDirection: 'row', alignItems: 'baseline', marginBottom: 16,
  },
  goalAmount: {
    fontSize: 24, fontWeight: 'bold', color: colors.textPrimary,
  },
  goalTarget: {
    fontSize: 16, color: colors.textMuted,
  },
  progressBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 12, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', borderRadius: 4,
  },
  goalProgress: {
    fontSize: 13, color: colors.textSecondary,
  },
  // Insight
  insightCard: {
    ...glassmorphism.card,
    borderColor: 'rgba(186,143,13,0.3)',
    padding: 20, marginBottom: 24,
  },
  insightHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  insightTitle: {
    color: colors.accent, fontWeight: 'bold', marginLeft: 8, fontSize: 16,
  },
  insightText: {
    color: colors.textPrimary, fontSize: 14, lineHeight: 20,
  },
  // Transactions
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  viewAll: {
    color: colors.accent, fontSize: 14, fontWeight: '600', marginBottom: 16,
  },
  transactionList: { marginBottom: 20 },
  transactionItem: {
    flexDirection: 'row', alignItems: 'center',
    ...glassmorphism.card,
    borderRadius: 16,
    padding: 14, marginBottom: 10,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  transactionDetails: { flex: 1, marginLeft: 14 },
  transactionName: {
    fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 3,
  },
  transactionTime: { fontSize: 12, color: colors.textMuted },
  transactionAmount: { fontSize: 15, fontWeight: '600' },
  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 40,
  },
  emptyText: {
    color: colors.textMuted, fontSize: 16, marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  emptyButtonText: {
    color: '#000', fontWeight: '700', fontSize: 14,
  },
});
