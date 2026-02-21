import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Activity, TrendingUp, BookOpen, Lightbulb, ShieldCheck, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from '../components/BottomNav';
import useFinanceStore from '../store/financeStore';
import { colors, gradients, glassmorphism } from '../theme';
import { useTranslation } from 'react-i18next';

export default function FinancialInsights({ navigation }) {
  const { t } = useTranslation();
  const { healthScore, lessons, fetchHealthScore, fetchLessons } = useFinanceStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHealthScore();
    fetchLessons();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHealthScore(), fetchLessons()]);
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

          {/* Health Score Card */}
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

            {/* Breakdown */}
            {Object.entries(breakdown).map(([key, data]) => (
              <View key={key} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: data.status === 'great' ? '#4caf50' : data.status === 'good' ? '#ff9800' : '#e74c3c' }
                  ]} />
                  <Text style={styles.breakdownLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                </View>
                <Text style={styles.breakdownValue}>{data.value}</Text>
              </View>
            ))}
          </LinearGradient>

          {/* Tips */}
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

          {/* Financial Literacy */}
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>Learn & Grow</Text>
          </View>

          {lessons.length > 0 ? (
            lessons.map((lesson) => (
              <TouchableOpacity key={lesson.id} style={styles.lessonCard} activeOpacity={0.8}>
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
});
