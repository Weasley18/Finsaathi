import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Target, Home, Heart, Shield, Car, Coins, Sparkles, TrendingUp } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import useFinanceStore from '../store/financeStore';
import { colors, gradients, glassmorphism } from '../theme';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const GOAL_ICONS = {
  home: Home,
  heart: Heart,
  shield: Shield,
  car: Car,
  coins: Coins,
  target: Target,
  sparkles: Sparkles,
};

const formatAmount = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

export default function SavingsGoals({ navigation }) {
  const { t } = useTranslation();
  const { goals, goalsSummary, goalsLoading, fetchGoals, addGoal, contributeToGoal } = useFinanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', icon: 'target' });
  const [contributeAmount, setContributeAmount] = useState('');

  useEffect(() => { fetchGoals(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, []);

  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.targetAmount) return;
    try {
      await addGoal({
        name: newGoal.name,
        targetAmount: parseFloat(newGoal.targetAmount),
        icon: newGoal.icon,
      });
      setShowAddModal(false);
      setNewGoal({ name: '', targetAmount: '', icon: 'target' });
    } catch (e) {
      Alert.alert('Error', 'Failed to create goal');
    }
  };

  const handleContribute = async () => {
    if (!contributeAmount || !selectedGoal) return;
    try {
      const result = await contributeToGoal(selectedGoal.id, parseFloat(contributeAmount));
      Alert.alert(result.completed ? '🎉 Goal Achieved!' : '✅ Added!', result.message);
      setShowContributeModal(false);
      setContributeAmount('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add contribution');
    }
  };

  const handlePause = async (id) => {
    Alert.alert(
      'Put on Hold',
      'Are you sure you want to put this goal on hold?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Pause',
          style: 'destructive',
          onPress: async () => {
            try {
              await useFinanceStore.getState().updateGoal(id, { status: 'PAUSED' });
            } catch (e) {
              Alert.alert('Error', 'Failed to update goal');
            }
          }
        },
      ]
    );
  };

  const handleResume = async (id) => {
    try {
      await useFinanceStore.getState().updateGoal(id, { status: 'ACTIVE' });
    } catch (e) {
      Alert.alert('Error', 'Failed to resume goal');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('goals.myEmpire')}</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Plus size={24} color={colors.brightGold} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brightGold} />}
      >
        {/* Summary */}
        {goalsSummary && (
          <LinearGradient colors={gradients.surfaceCard} style={[styles.summaryCard, glassmorphism.cardElevated]}>
            <Text style={styles.summaryLabel}>{t('goals.totalWealth').toUpperCase()}</Text>
            <Text style={styles.summaryAmount}>{formatAmount(goalsSummary.totalSaved)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>{goalsSummary.activeGoals}</Text>
                <Text style={styles.summaryItemLabel}>Active</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>{goalsSummary.completedGoals}</Text>
                <Text style={styles.summaryItemLabel}>Completed</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>{goalsSummary.overallProgress}%</Text>
                <Text style={styles.summaryItemLabel}>Progress</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Goals List */}
        <Text style={styles.sectionTitle}>{t('goals.treasuryGoals')}</Text>

        {goalsLoading && goals.length === 0 ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          goals.map((goal) => {
            const IconComponent = GOAL_ICONS[goal.icon] || Target;
            const progress = goal.progress || (goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount * 100) : 0);
            const isCompleted = goal.status === 'COMPLETED' || progress >= 100;

            return (
              <TouchableOpacity
                key={goal.id}
                activeOpacity={goal.status === 'PAUSED' ? 1 : 0.8}
                onPress={() => {
                  if (goal.status !== 'PAUSED' && !isCompleted) {
                    setSelectedGoal(goal); setShowContributeModal(true);
                  }
                }}
              >
                <LinearGradient
                  colors={gradients.surfaceCard}
                  style={[styles.goalCard, glassmorphism.card, goal.status === 'PAUSED' && { opacity: 0.7 }]}
                >
                  <View style={styles.goalHeader}>
                    <View style={[styles.goalIcon, isCompleted && styles.goalIconCompleted, goal.status === 'PAUSED' && { backgroundColor: 'transparent', borderColor: colors.warning, borderWidth: 1 }]}>
                      <IconComponent size={22} color={isCompleted ? '#000' : goal.status === 'PAUSED' ? colors.warning : colors.accent} />
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalTarget}>{t('goals.target')}: {formatAmount(goal.targetAmount)}</Text>
                    </View>
                    {isCompleted ? (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedText}>✓</Text>
                      </View>
                    ) : goal.status === 'PAUSED' && (
                      <View style={[styles.completedBadge, { backgroundColor: colors.warning }]}>
                        <Text style={[styles.completedText, { fontSize: 10, color: '#000', fontWeight: 'bold' }]}>HOLD</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.goalAmountRow}>
                    <Text style={styles.goalCurrentAmount}>{formatAmount(goal.currentAmount)}</Text>
                    <Text style={styles.goalOfTarget}> {t('goals.of')} {formatAmount(goal.targetAmount)}</Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={isCompleted ? ['#4caf50', '#8bc34a'] : goal.status === 'PAUSED' ? ['#ff9800', '#ffb74d'] : gradients.goldAccent}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]}
                    />
                  </View>

                  <View style={styles.goalFooter}>
                    <Text style={styles.goalProgressText}>{progress.toFixed(0)}% complete</Text>
                    {goal.status === 'PAUSED' ? (
                      <Text style={[styles.goalDeadline, { color: colors.warning }]}>ON HOLD</Text>
                    ) : goal.daysUntilTarget != null && goal.daysUntilTarget > 0 ? (
                      <Text style={styles.goalDeadline}>{goal.daysUntilTarget} days left</Text>
                    ) : null}
                  </View>

                  {/* Actions row for paused goals or active goals to pause */}
                  {!isCompleted && (
                    <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                      {goal.status === 'PAUSED' ? (
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
                          onPress={() => handleResume(goal.id)}
                        >
                          <Text style={{ color: '#000', fontWeight: '600' }}>Resume Goal</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: 'rgba(255, 152, 0, 0.15)', borderWidth: 1, borderColor: colors.warning, paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
                          onPress={() => handlePause(goal.id)}
                        >
                          <Text style={{ color: colors.warning, fontWeight: '600' }}>Put on Hold</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        )}

        {goals.length === 0 && !goalsLoading && (
          <View style={styles.emptyState}>
            <Target size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyText}>Set your first savings goal and start building your empire!</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
              <LinearGradient colors={gradients.goldAccent} style={styles.emptyBtnGradient}>
                <Text style={styles.emptyBtnText}>Create Goal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Savings Goal</Text>

            <Text style={styles.inputLabel}>Goal Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Dream Home, Emergency Fund"
              placeholderTextColor={colors.textMuted}
              value={newGoal.name}
              onChangeText={(t) => setNewGoal(prev => ({ ...prev, name: t }))}
            />

            <Text style={styles.inputLabel}>Target Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="100000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newGoal.targetAmount}
              onChangeText={(t) => setNewGoal(prev => ({ ...prev, targetAmount: t }))}
            />

            <Text style={styles.inputLabel}>Icon</Text>
            <View style={styles.iconPicker}>
              {Object.entries(GOAL_ICONS).map(([key, Icon]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.iconOption, newGoal.icon === key && styles.iconOptionSelected]}
                  onPress={() => setNewGoal(prev => ({ ...prev, icon: key }))}
                >
                  <Icon size={20} color={newGoal.icon === key ? colors.brightGold : colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleAddGoal}>
                <LinearGradient colors={gradients.goldAccent} style={styles.createBtnGradient}>
                  <Text style={styles.createBtnText}>Create Goal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={showContributeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to {selectedGoal?.name}</Text>
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="1000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={contributeAmount}
              onChangeText={setContributeAmount}
              autoFocus
            />

            {selectedGoal && (
              <Text style={styles.contributeInfo}>
                Remaining: {formatAmount(selectedGoal.remaining || (selectedGoal.targetAmount - selectedGoal.currentAmount))}
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowContributeModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleContribute}>
                <LinearGradient colors={gradients.goldAccent} style={styles.createBtnGradient}>
                  <Text style={styles.createBtnText}>Add Savings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.brightGold },
  addBtn: { padding: 8 },
  scrollContent: { padding: 24 },
  // Summary
  summaryCard: { padding: 24, marginBottom: 28 },
  summaryLabel: {
    fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 8,
  },
  summaryAmount: { fontSize: 34, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 20 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center' },
  summaryItemValue: { fontSize: 20, fontWeight: 'bold', color: colors.brightGold },
  summaryItemLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: colors.divider },
  // Section
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  // Goal Card
  goalCard: { padding: 20, marginBottom: 16 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  goalIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(186,143,13,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  goalIconCompleted: { backgroundColor: colors.brightGold },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  goalTarget: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginTop: 2 },
  completedBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#4caf50',
    alignItems: 'center', justifyContent: 'center',
  },
  completedText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  goalAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 },
  goalCurrentAmount: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary },
  goalOfTarget: { fontSize: 14, color: colors.textMuted },
  progressBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 12, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  goalProgressText: { fontSize: 13, color: colors.textSecondary },
  goalDeadline: { fontSize: 12, color: colors.textMuted },
  goalSavingsNeeded: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  emptyBtn: { borderRadius: 24, overflow: 'hidden' },
  emptyBtnGradient: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  emptyBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 24,
  },
  inputLabel: { fontSize: 12, color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  modalInput: {
    ...glassmorphism.input,
    padding: 14, fontSize: 16, color: colors.textPrimary, marginBottom: 20,
  },
  contributeInfo: {
    fontSize: 13, color: colors.textSecondary, marginBottom: 20,
  },
  iconPicker: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  iconOption: {
    width: 44, height: 44, borderRadius: 14,
    ...glassmorphism.card, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  iconOptionSelected: { borderColor: colors.brightGold, borderWidth: 1.5 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 16,
    ...glassmorphism.card, borderRadius: 16,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  createBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  createBtnGradient: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  createBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
