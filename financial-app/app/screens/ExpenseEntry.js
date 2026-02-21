import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ShoppingBag, Car, Lightbulb, Heart, BookOpen, Film, CreditCard, Coffee } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import useFinanceStore from '../store/financeStore';
import { colors, gradients, glassmorphism } from '../theme';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { name: 'Food', icon: Coffee, color: '#ff9f43' },
  { name: 'Transport', icon: Car, color: '#54a0ff' },
  { name: 'Shopping', icon: ShoppingBag, color: '#ee5a24' },
  { name: 'Bills', icon: Lightbulb, color: '#4caf50' },
  { name: 'Health', icon: Heart, color: '#e74c3c' },
  { name: 'Entertainment', icon: Film, color: '#a55eea' },
  { name: 'Education', icon: BookOpen, color: '#3498db' },
  { name: 'EMI', icon: CreditCard, color: '#e84393' },
];

export default function ExpenseEntry({ navigation }) {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { addTransaction } = useFinanceStore();

  const handleSave = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Missing Info', 'Please enter an amount and select a category.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    setSaving(true);
    try {
      await addTransaction({
        amount: numAmount,
        type: 'EXPENSE',
        category: selectedCategory,
        description: description || `${selectedCategory} expense`,
        source: 'MANUAL',
      });

      Alert.alert('Saved! ✅', `₹${numAmount.toLocaleString('en-IN')} expense recorded in ${selectedCategory}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
          </View>

          {/* Category Selection */}
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              const isSelected = selectedCategory === cat.name;

              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.categoryItem,
                    isSelected && styles.categorySelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.categoryIcon,
                    { backgroundColor: isSelected ? cat.color : 'rgba(255,255,255,0.05)' },
                  ]}>
                    <IconComponent size={22} color={isSelected ? '#fff' : cat.color} />
                  </View>
                  <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                    {cat.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Check size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description */}
          <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
          <View style={styles.descriptionContainer}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="e.g., Swiggy order, Monthly groceries..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!amount || !selectedCategory || saving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!amount || !selectedCategory || saving}
          >
            <LinearGradient
              colors={amount && selectedCategory ? gradients.goldAccent : [colors.surfaceLight, colors.surfaceLight]}
              style={styles.saveBtnGradient}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : amount ? `Save ₹${parseFloat(amount).toLocaleString('en-IN')} Expense` : 'Save Expense'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  closeBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scrollContent: { padding: 24 },
  // Amount
  amountSection: {
    alignItems: 'center', paddingVertical: 32,
  },
  amountLabel: {
    fontSize: 12, color: colors.textMuted, letterSpacing: 2, marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  rupeeSymbol: {
    fontSize: 42, fontWeight: '300', color: colors.textMuted, marginRight: 4,
  },
  amountInput: {
    fontSize: 56, fontWeight: 'bold', color: colors.textPrimary,
    minWidth: 100, textAlign: 'center',
  },
  // Category
  sectionLabel: {
    fontSize: 12, color: colors.textMuted, letterSpacing: 2, marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32,
  },
  categoryItem: {
    width: (width - 48 - 36) / 4,
    alignItems: 'center', paddingVertical: 14,
    ...glassmorphism.card,
    borderRadius: 16,
  },
  categorySelected: {
    borderColor: colors.brightGold,
    borderWidth: 1.5,
  },
  categoryIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  categoryName: {
    fontSize: 11, color: colors.textSecondary, textAlign: 'center',
  },
  categoryNameSelected: {
    color: colors.brightGold, fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.brightGold,
    alignItems: 'center', justifyContent: 'center',
  },
  // Description
  descriptionContainer: {
    ...glassmorphism.input,
    padding: 16, marginBottom: 32,
  },
  descriptionInput: {
    color: colors.textPrimary, fontSize: 15, minHeight: 40,
  },
  // Save
  saveBtn: {
    borderRadius: 28, overflow: 'hidden', marginBottom: 40,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnGradient: {
    paddingVertical: 18, alignItems: 'center',
    borderRadius: 28,
  },
  saveBtnText: {
    fontSize: 17, fontWeight: '700', color: '#000',
  },
});
