import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from '../components/BottomNav';
import useFinanceStore from '../store/financeStore';
import { colors, gradients, glassmorphism } from '../theme';

const { width } = Dimensions.get('window');

const CATEGORY_COLORS = {
  Food: '#ff9f43',
  Transport: '#54a0ff',
  Shopping: '#ee5a24',
  Bills: '#4caf50',
  Health: '#e74c3c',
  Entertainment: '#a55eea',
  Education: '#3498db',
  EMI: '#e84393',
};

const formatAmount = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

export default function SpendingReport({ navigation }) {
  const { spendingInsights, fetchSpendingInsights, transactions, fetchTransactions, transactionsLoading } = useFinanceStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSpendingInsights();
    fetchTransactions();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSpendingInsights(), fetchTransactions()]);
    setRefreshing(false);
  }, []);

  const thisMonth = spendingInsights?.thisMonth || {};
  const lastMonth = spendingInsights?.lastMonth || {};
  const change = spendingInsights?.change || {};
  const topCategories = spendingInsights?.topCategories || [];

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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Spending Report</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Month Comparison */}
          <View style={styles.comparisonRow}>
            <LinearGradient colors={gradients.surfaceCard} style={[styles.monthCard, glassmorphism.card]}>
              <Text style={styles.monthLabel}>THIS MONTH</Text>
              <Text style={styles.monthAmount}>{formatAmount(thisMonth.total)}</Text>
              <Text style={styles.monthCount}>{thisMonth.transactionCount || 0} transactions</Text>
            </LinearGradient>

            <LinearGradient colors={gradients.surfaceCard} style={[styles.monthCard, glassmorphism.card]}>
              <Text style={styles.monthLabel}>LAST MONTH</Text>
              <Text style={styles.monthAmount}>{formatAmount(lastMonth.total)}</Text>
              <Text style={styles.monthCount}>{lastMonth.transactionCount || 0} transactions</Text>
            </LinearGradient>
          </View>

          {/* Change Badge */}
          {change.direction && (
            <View style={[styles.changeBadge, change.direction === 'down' ? styles.changeBadgeGreen : styles.changeBadgeRed]}>
              {change.direction === 'down' ? (
                <TrendingDown size={16} color="#4caf50" />
              ) : (
                <TrendingUp size={16} color="#e74c3c" />
              )}
              <Text style={[styles.changeText, change.direction === 'down' ? styles.changeTextGreen : styles.changeTextRed]}>
                {Math.abs(parseFloat(change.percentage || 0))}%
                {change.direction === 'down' ? ' less' : ' more'} than last month
              </Text>
            </View>
          )}

          {/* Category Breakdown */}
          <Text style={styles.sectionTitle}>Spending by Category</Text>

          {topCategories.length > 0 ? (
            <View style={styles.categoryList}>
              {topCategories.map((cat, index) => {
                const categoryColor = CATEGORY_COLORS[cat.category] || colors.accent;
                const percentage = parseFloat(cat.percentage || 0);

                return (
                  <View key={cat.category || index} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                        <Text style={styles.categoryName}>{cat.category}</Text>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={styles.categoryAmount}>{formatAmount(cat.amount)}</Text>
                        <Text style={styles.categoryPercent}>{percentage}%</Text>
                      </View>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: categoryColor }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No spending data yet this month</Text>
            </View>
          )}

          {/* All Transactions */}
          <Text style={styles.sectionTitle}>All Transactions</Text>

          {transactionsLoading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 30 }} />
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((t, index) => {
                const isExpense = t.type === 'EXPENSE';
                const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                return (
                  <View key={t.id || index} style={styles.txnItem}>
                    <View style={[styles.txnDot, { backgroundColor: CATEGORY_COLORS[t.category] || colors.accent }]} />
                    <View style={styles.txnInfo}>
                      <Text style={styles.txnMerchant}>{t.merchant || t.category}</Text>
                      <Text style={styles.txnMeta}>{dateStr} • {t.category} • {t.source}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: isExpense ? '#ff6b6b' : '#4caf50' }]}>
                      {isExpense ? '−' : '+'}{formatAmount(t.amount)}
                    </Text>
                  </View>
                );
              })}

              {transactions.length === 0 && (
                <Text style={styles.emptyText}>No transactions found</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  // Comparison
  comparisonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  monthCard: { flex: 1, padding: 16 },
  monthLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 2, marginBottom: 8 },
  monthAmount: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  monthCount: { fontSize: 12, color: colors.textSecondary },
  // Change
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: 16, marginBottom: 28,
  },
  changeBadgeGreen: { backgroundColor: 'rgba(76,175,80,0.1)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)' },
  changeBadgeRed: { backgroundColor: 'rgba(231,76,60,0.1)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)' },
  changeText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  changeTextGreen: { color: '#4caf50' },
  changeTextRed: { color: '#e74c3c' },
  // Categories
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  categoryList: { marginBottom: 28 },
  categoryItem: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { fontSize: 15, color: colors.textPrimary },
  categoryRight: { flexDirection: 'row', alignItems: 'center' },
  categoryAmount: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginRight: 8 },
  categoryPercent: { fontSize: 12, color: colors.textMuted },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  // Transactions
  transactionsList: {},
  txnItem: {
    flexDirection: 'row', alignItems: 'center',
    ...glassmorphism.card, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  txnDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  txnInfo: { flex: 1 },
  txnMerchant: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  txnMeta: { fontSize: 11, color: colors.textMuted },
  txnAmount: { fontSize: 14, fontWeight: '600' },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
