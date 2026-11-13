import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Activity, TrendingUp, BookOpen, Lightbulb, ShieldCheck, Clock, AlertTriangle, Wallet, Brain } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from '../components/BottomNav';
import useFinanceStore from '../store/financeStore';
import { colors, gradients, glassmorphism } from '../theme';
import { useTranslation } from 'react-i18next';

const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const SEVERITY_COLORS = { high: '#F44336', medium: '#FF9800', low: '#FFC107' };

export default function FinancialInsights({ navigation }) {
  const { t } = useTranslation();
  const { healthScore, lessons, anomalies, forecast, adaptiveBudget,
    fetchHealthScore, fetchLessons, fetchAnomalies, fetchForecast, fetchAdaptiveBudget } = useFinanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('health'); // health | anomalies | forecast | budget | lessons

  useEffect(() => {
    fetchHealthScore();
    fetchLessons();
    fetchAnomalies();
    fetchForecast();
    fetchAdaptiveBudget();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHealthScore(), fetchLessons(), fetchAnomalies(), fetchForecast(), fetchAdaptiveBudget()]);
    setRefreshing(false);
  }, []);

  const score = healthScore?.healthScore || 0;
  const grade = healthScore?.grade || '—';
  const breakdown = healthScore?.breakdown || {};
  const tips = healthScore?.tips || [];

  const getScoreColor = () => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#ff5722';
    return '#e74c3c';
  };

  const DIFFICULTY_COLORS = {
    Beginner: '#4caf50',
    Intermediate: '#ff9800',
    Advanced: '#e74c3c',
  };

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
            <Text style={styles.headerTitle}>{t('insights.title')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tab Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
            {[
              { key: 'health', icon: Activity, label: 'Health' },
              { key: 'anomalies', icon: AlertTriangle, label: 'Anomalies' },
              { key: 'forecast', icon: TrendingUp, label: 'Forecast' },
              { key: 'budget', icon: Wallet, label: 'Smart Budget' },
              { key: 'lessons', icon: BookOpen, label: 'Lessons' },
            ].map(tab => (
              <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)}
                style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}>
                <tab.icon size={14} color={activeTab === tab.key ? '#000' : colors.textMuted} />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ─── Health Tab ─── */}
          {activeTab === 'health' && (
            <>
              <LinearGradient colors={gradients.surfaceCard} style={[styles.scoreCard, glassmorphism.cardElevated]}>
                <View style={styles.scoreHeader}>
                  <Activity size={20} color={colors.accent} />
                  <Text style={styles.scoreLabel}>{t('insights.healthScore')}</Text>
                </View>
                <View style={styles.scoreCircle}>
                  <View style={[styles.scoreRing, { borderColor: getScoreColor() }]}>
                    <Text style={[styles.scoreValue, { color: getScoreColor() }]}>{score}</Text>
                    <Text style={styles.scoreOf}>/100</Text>
                  </View>
                </View>
                <Text style={styles.scoreGrade}>{grade}</Text>
                {Object.entries(breakdown).map(([key, data]) => (
                  <View key={key} style={styles.breakdownItem}>
                    <View style={styles.breakdownLeft}>
                      <View style={[styles.statusDot, { backgroundColor: data.status === 'great' ? '#4caf50' : data.status === 'good' ? '#ff9800' : '#e74c3c' }]} />
                      <Text style={styles.breakdownLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{data.value}</Text>
                  </View>
                ))}
              </LinearGradient>
              {tips.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>💡 AI Tips for You</Text>
                  {tips.map((tip, i) => (
                    <View key={i} style={styles.tipCard}>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {/* ─── Anomalies Tab ─── */}
          {activeTab === 'anomalies' && (
            <>
              <Text style={styles.sectionTitle}>Spending Anomalies</Text>
              {!anomalies ? (
                <ActivityIndicator size="large" color={colors.accent} />
              ) : !anomalies.anomalies?.length ? (
                <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 32, alignItems: 'center' }]}>
                  <ShieldCheck size={40} color="#4caf50" />
                  <Text style={[styles.lessonTitle, { marginTop: 12 }]}>No anomalies detected!</Text>
                  <Text style={styles.lessonDesc}>Your spending looks normal.</Text>
                </LinearGradient>
              ) : (
                anomalies.anomalies.map((a, i) => (
                  <LinearGradient key={i} colors={gradients.surfaceCard} style={[glassmorphism.card, styles.anomalyCard]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <AlertTriangle size={16} color={SEVERITY_COLORS[a.severity] || '#FF9800'} />
                      <Text style={[styles.lessonTitle, { marginLeft: 8, flex: 1 }]}>{a.category || a.merchant || 'Unknown'}</Text>
                      <View style={[styles.severityBadge, { backgroundColor: (SEVERITY_COLORS[a.severity] || '#FF9800') + '22' }]}>
                        <Text style={[styles.severityText, { color: SEVERITY_COLORS[a.severity] || '#FF9800' }]}>{a.severity}</Text>
                      </View>
                    </View>
                    <Text style={[styles.lessonDesc, { marginBottom: 4 }]}>{a.reason || a.description}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{fmt(a.amount)}</Text>
                    {a.suggestion && (
                      <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <Lightbulb size={13} color={colors.accent} />
                        <Text style={{ fontSize: 12, color: colors.accent, marginLeft: 4, flex: 1 }}>{a.suggestion}</Text>
                      </View>
                    )}
                  </LinearGradient>
                ))
              )}
            </>
          )}

          {/* ─── Forecast Tab ─── */}
          {activeTab === 'forecast' && (
            <>
              <Text style={styles.sectionTitle}>Spending Forecast</Text>
              {!forecast ? (
                <ActivityIndicator size="large" color={colors.accent} />
              ) : (
                <>
                  <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 20, marginBottom: 16 }]}>
                    <Text style={styles.lessonDesc}>Predicted 30-Day Spending</Text>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary }}>
                      {fmt(forecast.totalPredicted || forecast.predictedTotal)}
                    </Text>
                  </LinearGradient>
                  {forecast.categoryForecasts?.map((cf, i) => (
                    <LinearGradient key={cf.category} colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 16, marginBottom: 10 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.lessonTitle}>{cf.category}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{fmt(cf.predicted)}</Text>
                      </View>
                      {cf.trend && (
                        <Text style={{ fontSize: 12, color: cf.trend === 'up' ? '#F44336' : '#4caf50', marginTop: 4 }}>
                          {cf.trend === 'up' ? '↑ Increasing' : '↓ Decreasing'} trend
                        </Text>
                      )}
                    </LinearGradient>
                  ))}
                  {forecast.budgetAlerts?.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>⚠️ Budget Alerts</Text>
                      {forecast.budgetAlerts.map((alert, i) => (
                        <LinearGradient key={i} colors={gradients.surfaceCard}
                          style={[glassmorphism.card, { padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#F44336' }]}>
                          <Text style={styles.lessonTitle}>{alert.category}</Text>
                          <Text style={styles.lessonDesc}>
                            Budget: {fmt(alert.budget)} · Predicted: {fmt(alert.predicted)}
                          </Text>
                        </LinearGradient>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── Smart Budget Tab ─── */}
          {activeTab === 'budget' && (
            <>
              <Text style={styles.sectionTitle}>Adaptive Budget</Text>
              {!adaptiveBudget ? (
                <ActivityIndicator size="large" color={colors.accent} />
              ) : (
                <>
                  {adaptiveBudget.rule && (
                    <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 20, marginBottom: 16 }]}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{adaptiveBudget.rule} Rule</Text>
                      <Text style={styles.lessonDesc}>Income: {fmt(adaptiveBudget.estimatedIncome)}</Text>
                    </LinearGradient>
                  )}
                  {adaptiveBudget.allocation && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                      {Object.entries(adaptiveBudget.allocation).map(([key, val]) => {
                        const clrs = { needs: '#2196F3', wants: '#FF9800', savings: '#4caf50' };
                        return (
                          <LinearGradient key={key} colors={gradients.surfaceCard}
                            style={[glassmorphism.card, { flex: 1, padding: 16, alignItems: 'center' }]}>
                            <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' }}>{key}</Text>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: clrs[key] || colors.textPrimary }}>{fmt(val)}</Text>
                          </LinearGradient>
                        );
                      })}
                    </View>
                  )}
                  {adaptiveBudget.categoryBudgets?.map((cb, i) => {
                    const pct = cb.budget > 0 ? Math.min(100, Math.round((cb.currentSpending / cb.budget) * 100)) : 0;
                    return (
                      <LinearGradient key={cb.category} colors={gradients.surfaceCard}
                        style={[glassmorphism.card, { padding: 14, marginBottom: 8 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={styles.lessonTitle}>{cb.category}</Text>
                          <Text style={{ fontSize: 12, color: pct > 90 ? '#F44336' : colors.textMuted }}>
                            {fmt(cb.currentSpending)} / {fmt(cb.budget)}
                          </Text>
                        </View>
                        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.divider, overflow: 'hidden' }}>
                          <View style={{
                            width: `${pct}%`, height: '100%', borderRadius: 3,
                            backgroundColor: pct > 90 ? '#F44336' : pct > 70 ? '#FF9800' : '#4caf50',
                          }} />
                        </View>
                      </LinearGradient>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* ─── Lessons Tab ─── */}
          {activeTab === 'lessons' && (
            <>
              <View style={styles.sectionHeader}>
                <BookOpen size={20} color={colors.accent} />
                <Text style={styles.sectionTitle}>Learn & Grow</Text>
              </View>
              {lessons.length > 0 ? (
                lessons.map((lesson) => (
                  <TouchableOpacity key={lesson.id} style={styles.lessonCard} activeOpacity={0.8}
                    onPress={() => navigation.navigate('LessonDetail', { lesson })}>
                    <LinearGradient colors={gradients.surfaceCard} style={[styles.lessonInner, glassmorphism.card]}>
                      <View style={styles.lessonHeader}>
                        <View style={styles.lessonCategoryBadge}>
                          <Text style={styles.lessonCategory}>{lesson.category}</Text>
                        </View>
                        <View style={[styles.difficultyBadge, { backgroundColor: `${DIFFICULTY_COLORS[lesson.difficulty] || colors.accent}20` }]}>
                          <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[lesson.difficulty] || colors.accent }]}>
                            {lesson.difficulty}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      <Text style={styles.lessonDesc}>{lesson.description}</Text>
                      <View style={styles.lessonFooter}>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))
              ) : (
                <ActivityIndicator size="large" color={colors.accent} />
              )}
            </>
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
  // Score
  scoreCard: { padding: 24, marginBottom: 28, alignItems: 'center' },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start' },
  scoreLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginLeft: 8 },
  scoreCircle: { marginBottom: 12 },
  scoreRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  scoreValue: { fontSize: 42, fontWeight: 'bold' },
  scoreOf: { fontSize: 14, color: colors.textMuted, marginTop: -4 },
  scoreGrade: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },
  // Breakdown
  breakdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: 10,
  },
  breakdownLabel: { fontSize: 14, color: colors.textSecondary, textTransform: 'capitalize' },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  // Tips
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16, marginLeft: 4 },
  tipCard: {
    ...glassmorphism.card,
    padding: 16, marginBottom: 10,
    borderColor: 'rgba(186,143,13,0.3)',
  },
  tipText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  // Section
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginTop: 12,
  },
  // Lessons
  lessonCard: { marginBottom: 12 },
  lessonInner: { padding: 18 },
  lessonHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  lessonCategoryBadge: {
    backgroundColor: 'rgba(186,143,13,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  lessonCategory: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  difficultyBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  difficultyText: { fontSize: 11, fontWeight: '600' },
  lessonTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  lessonDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  lessonFooter: { flexDirection: 'row', alignItems: 'center' },
  lessonDuration: { fontSize: 12, color: colors.textMuted, marginLeft: 6 },
  // Tabs
  tabBar: { marginBottom: 20, flexGrow: 0 },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabItemActive: { backgroundColor: colors.accent },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginLeft: 6 },
  tabLabelActive: { color: '#000' },
  // Anomalies
  anomalyCard: { padding: 16, marginBottom: 12 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});
