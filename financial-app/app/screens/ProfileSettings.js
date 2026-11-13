import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Globe, LogOut, Shield, Bell, Moon, ChevronRight, Sparkles, Edit3, Check, DollarSign, TrendingUp } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import { colors, gradients, glassmorphism } from '../theme';

const INCOME_RANGES = [
  { value: 'BELOW_10K', label: '< ₹10,000' },
  { value: 'FROM_10K_TO_25K', label: '₹10K – ₹25K' },
  { value: 'FROM_25K_TO_50K', label: '₹25K – ₹50K' },
  { value: 'FROM_50K_TO_1L', label: '₹50K – ₹1L' },
  { value: 'ABOVE_1L', label: '> ₹1 Lakh' },
];

const RISK_PROFILES = [
  { value: 'CONSERVATIVE', label: 'Conservative', emoji: '🛡️', desc: 'Low risk, stable returns' },
  { value: 'MODERATE', label: 'Moderate', emoji: '⚖️', desc: 'Balanced risk & growth' },
  { value: 'AGGRESSIVE', label: 'Aggressive', emoji: '🚀', desc: 'High risk, high potential' },
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', label: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'as', label: 'অসমীয়া', flag: '🇮🇳' },
];

export default function ProfileSettings({ navigation }) {
  const { user, logout, updateProfile } = useAuthStore();
  const { i18n, t } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editIncomeRange, setEditIncomeRange] = useState(user?.incomeRange || null);
  const [editRiskProfile, setEditRiskProfile] = useState(user?.riskProfile || null);
  const [editLanguage, setEditLanguage] = useState(user?.language || 'en');
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditIncomeRange(user?.incomeRange || null);
    setEditRiskProfile(user?.riskProfile || null);
    setEditLanguage(user?.language || 'en');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      const profileData = {
        name: editName.trim(),
        language: editLanguage,
      };
      if (editIncomeRange) profileData.incomeRange = editIncomeRange;
      if (editRiskProfile) profileData.riskProfile = editRiskProfile;

      await updateProfile(profileData);
      // Switch app locale when language changes
      if (editLanguage && editLanguage !== i18n.language) {
        i18n.changeLanguage(editLanguage);
      }
      setShowEditModal(false);
      Alert.alert('Updated ✅', 'Your profile has been saved.');
    } catch (e) {
      console.error('Profile update error:', e);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getIncomeLabel = (value) => {
    return INCOME_RANGES.find(r => r.value === value)?.label || 'Not set';
  };

  const getRiskLabel = (value) => {
    const risk = RISK_PROFILES.find(r => r.value === value);
    return risk ? `${risk.emoji} ${risk.label}` : 'Not set';
  };

  const getLangLabel = (code) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.flag} ${lang.label}` : 'English';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Avatar & Name */}
        <View style={styles.profileSection}>
          <LinearGradient colors={gradients.goldAccent} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profilePhone}>+91 {user?.phone || '—'}</Text>
          <Text style={styles.profileRole}>
            {user?.role === 'ADVISOR' ? '🏅 Advisor' : user?.role === 'ADMIN' ? '⚙️ Admin' : '👤 Member'}
          </Text>
          <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
            <Edit3 size={14} color={colors.accent} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow} onPress={openEditModal}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(186,143,13,0.15)' }]}>
                <User size={16} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Name</Text>
                <Text style={styles.settingValue}>{user?.name || 'Not set'}</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingRow} onPress={openEditModal}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(76,175,80,0.15)' }]}>
                <DollarSign size={16} color="#4caf50" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Income Range</Text>
                <Text style={styles.settingValue}>{getIncomeLabel(user?.incomeRange)}</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingRow} onPress={openEditModal}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(233,30,99,0.15)' }]}>
                <TrendingUp size={16} color="#e91e63" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Risk Profile</Text>
                <Text style={styles.settingValue}>{getRiskLabel(user?.riskProfile)}</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingRow} onPress={openEditModal}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(63,81,181,0.15)' }]}>
                <Globe size={16} color="#3f51b5" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingValue}>{getLangLabel(user?.language)}</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(156,39,176,0.15)' }]}>
                <Sparkles size={16} color="#9c27b0" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Member Since</Text>
                <Text style={styles.settingValue}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(255,152,0,0.15)' }]}>
                <Bell size={16} color="#ff9800" />
              </View>
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.surfaceLight, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(96,125,139,0.15)' }]}>
                <Moon size={16} color="#607d8b" />
              </View>
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.surfaceLight, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* More */}
        <Text style={styles.sectionLabel}>MORE</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('FinancialInsights')}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(186,143,13,0.15)' }]}>
                <Sparkles size={16} color={colors.accent} />
              </View>
              <Text style={styles.settingLabel}>Financial Insights</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('SpendingReport')}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(0,150,136,0.15)' }]}>
                <Globe size={16} color="#009688" />
              </View>
              <Text style={styles.settingLabel}>Spending Report</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('SecuritySettings')}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: 'rgba(244,67,54,0.15)' }]}>
                <Shield size={16} color="#f44336" />
              </View>
              <Text style={styles.settingLabel}>Security Settings</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>FinSaathi v1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Profile</Text>

              {/* Name */}
              <Text style={styles.inputLabel}>NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
              />

              {/* Income Range */}
              <Text style={styles.inputLabel}>MONTHLY INCOME RANGE</Text>
              <View style={styles.chipGrid}>
                {INCOME_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.value}
                    style={[
                      styles.chip,
                      editIncomeRange === range.value && styles.chipActive,
                    ]}
                    onPress={() => setEditIncomeRange(range.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      editIncomeRange === range.value && styles.chipTextActive,
                    ]}>
                      {range.label}
                    </Text>
                    {editIncomeRange === range.value && (
                      <Check size={14} color={colors.brightGold} style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Risk Profile */}
              <Text style={styles.inputLabel}>RISK PROFILE</Text>
              <View style={styles.riskGrid}>
                {RISK_PROFILES.map((risk) => (
                  <TouchableOpacity
                    key={risk.value}
                    style={[
                      styles.riskCard,
                      editRiskProfile === risk.value && styles.riskCardActive,
                    ]}
                    onPress={() => setEditRiskProfile(risk.value)}
                  >
                    <Text style={styles.riskEmoji}>{risk.emoji}</Text>
                    <Text style={[
                      styles.riskLabel,
                      editRiskProfile === risk.value && styles.riskLabelActive,
                    ]}>
                      {risk.label}
                    </Text>
                    <Text style={styles.riskDesc}>{risk.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Language */}
              <Text style={styles.inputLabel}>LANGUAGE</Text>
              <View style={styles.languageGrid}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langBtn,
                      editLanguage === lang.code && styles.langBtnActive,
                    ]}
                    onPress={() => setEditLanguage(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.langLabel,
                      editLanguage === lang.code && styles.langLabelActive,
                    ]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  <LinearGradient colors={gradients.goldAccent} style={styles.saveBtnGradient}>
                    {saving ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  scrollContent: { padding: 24 },
  // Profile
  profileSection: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  profilePhone: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  profileRole: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    ...glassmorphism.card, borderRadius: 20,
    borderColor: 'rgba(186,143,13,0.4)',
  },
  editBtnText: { color: colors.accent, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  // Sections
  sectionLabel: {
    fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 12,
  },
  settingsCard: {
    ...glassmorphism.card, borderRadius: 20,
    padding: 4, marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, paddingHorizontal: 16,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIconBg: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  settingLabel: { fontSize: 14, color: colors.textPrimary },
  settingValue: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  settingDivider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 16 },
  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, marginTop: 8,
    ...glassmorphism.card, borderRadius: 16,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  logoutText: { color: '#e74c3c', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  versionText: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 20 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    maxHeight: '90%',
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 24 },
  inputLabel: {
    fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 10, marginTop: 4,
  },
  modalInput: {
    ...glassmorphism.input,
    padding: 14, fontSize: 16, color: colors.textPrimary, marginBottom: 16,
  },
  // Income chips
  chipGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(186,143,13,0.15)',
    borderColor: colors.accent,
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: colors.brightGold, fontWeight: '700' },
  // Risk cards
  riskGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  riskCard: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  riskCardActive: {
    backgroundColor: 'rgba(186,143,13,0.12)',
    borderColor: colors.accent,
  },
  riskEmoji: { fontSize: 24, marginBottom: 6 },
  riskLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  riskLabelActive: { color: colors.brightGold },
  riskDesc: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  // Language
  languageGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  langBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    ...glassmorphism.card, borderRadius: 14,
  },
  langBtnActive: { borderWidth: 1.5, borderColor: colors.brightGold },
  langFlag: { fontSize: 20, marginBottom: 6 },
  langLabel: { fontSize: 13, color: colors.textSecondary },
  langLabelActive: { color: colors.brightGold, fontWeight: '600' },
  // Modal actions
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 16,
    ...glassmorphism.card, borderRadius: 16, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
});
