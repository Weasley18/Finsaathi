import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Briefcase, Building2, ArrowRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import useAuthStore from '../store/authStore';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const INCOME_RANGES = [
    { label: '< ₹15,000', value: 'BELOW_10K' },
    { label: '₹15K - ₹30K', value: 'FROM_10K_TO_25K' },
    { label: '₹30K - ₹50K', value: 'FROM_25K_TO_50K' },
    { label: '₹50K - ₹1L', value: 'FROM_50K_TO_1L' },
    { label: '> ₹1 Lakh', value: 'ABOVE_1L' },
];

const GOALS = [
    { label: 'Capital Preservation (Safe)', value: 'CONSERVATIVE' },
    { label: 'Balanced Growth', value: 'MODERATE' },
    { label: 'Aggressive Wealth Creation', value: 'AGGRESSIVE' },
];

export default function OnboardingScreen({ navigation }) {
    const { t } = useTranslation();
    const [step, setStep] = useState(1); // 1: Role, 2: Details
    const [role, setRole] = useState(null); // 'END_USER', 'ADVISOR', 'PARTNER'
    const [name, setName] = useState('');
    const [businessId, setBusinessId] = useState(''); // ARN or GSTIN
    const [income, setIncome] = useState('FROM_25K_TO_50K');
    const [goal, setGoal] = useState('MODERATE');
    const [saving, setSaving] = useState(false);

    const { completeProfile } = useAuthStore();

    const handleNextStep = () => {
        if (!role) return;
        setStep(2);
    };

    const handleComplete = async () => {
        if (!name) {
            Alert.alert('Required', 'Please enter your name.');
            return;
        }
        if ((role === 'ADVISOR' || role === 'PARTNER') && !businessId) {
            Alert.alert('Required', 'Please enter your ID (ARN / GSTIN).');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name,
                language: 'en',
                role,
                ...(role === 'END_USER' ? { incomeRange: income, riskProfile: goal } : {}),
                ...((role === 'ADVISOR' || role === 'PARTNER') ? { businessId } : {})
            };

            await completeProfile(payload);

            if (role === 'ADVISOR' || role === 'PARTNER') {
                navigation.replace('WaitingRoom');
            } else {
                navigation.replace('Dashboard');
            }
        } catch (error) {
            console.error('Profile setup error:', error);
            Alert.alert('Error', 'Failed to save your profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderRoleSelection = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.title}>Join FinSaathi</Text>
            <Text style={styles.subtitle}>Select how you want to use the platform.</Text>

            <TouchableOpacity
                style={[styles.roleCard, role === 'END_USER' && styles.roleCardActive]}
                onPress={() => setRole('END_USER')}
            >
                <View style={[styles.iconBox, role === 'END_USER' && styles.iconBoxActive]}>
                    <User size={28} color={role === 'END_USER' ? '#d4af35' : '#888'} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={[styles.roleTitle, role === 'END_USER' && styles.textActive]}>Individual Investor</Text>
                    <Text style={styles.roleDesc}>Manage personal finances, goals & savings.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.roleCard, role === 'ADVISOR' && styles.roleCardActive]}
                onPress={() => setRole('ADVISOR')}
            >
                <View style={[styles.iconBox, role === 'ADVISOR' && styles.iconBoxActive]}>
                    <Briefcase size={28} color={role === 'ADVISOR' ? '#d4af35' : '#888'} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={[styles.roleTitle, role === 'ADVISOR' && styles.textActive]}>Financial Advisor</Text>
                    <Text style={styles.roleDesc}>Manage clients, get AI assistance, and grow.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.roleCard, role === 'PARTNER' && styles.roleCardActive]}
                onPress={() => setRole('PARTNER')}
            >
                <View style={[styles.iconBox, role === 'PARTNER' && styles.iconBoxActive]}>
                    <Building2 size={28} color={role === 'PARTNER' ? '#d4af35' : '#888'} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={[styles.roleTitle, role === 'PARTNER' && styles.textActive]}>Institutional Partner</Text>
                    <Text style={styles.roleDesc}>Offer financial products to massive audiences.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.mainBtn, !role && styles.mainBtnDisabled]}
                disabled={!role}
                onPress={handleNextStep}
            >
                <Text style={styles.mainBtnText}>{t('common.continue')}</Text>
                <ArrowRight size={20} color={role ? "black" : "#666"} />
            </TouchableOpacity>
        </View>
    );

    const renderDetailsForm = () => (
        <View style={styles.stepContainer}>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Your Details</Text>
            <Text style={styles.subtitle}>Help us set up your workspace.</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>{role === 'PARTNER' ? 'Company Name' : 'Full Name'}</Text>
                <TextInput
                    style={styles.input}
                    placeholder={role === 'PARTNER' ? "Acme Financials" : "Rahul Sharma"}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={name}
                    onChangeText={setName}
                />
            </View>

            {role === 'END_USER' && (
                <>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Monthly Income</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                            {INCOME_RANGES.map((r, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.chip, income === r.value && styles.chipActive]}
                                    onPress={() => setIncome(r.value)}
                                >
                                    <Text style={[styles.chipText, income === r.value && styles.chipTextActive]}>{r.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Primary Goal</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                            {GOALS.map((g, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.chip, goal === g.value && styles.chipActive]}
                                    onPress={() => setGoal(g.value)}
                                >
                                    <Text style={[styles.chipText, goal === g.value && styles.chipTextActive]}>{g.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}

            {(role === 'ADVISOR' || role === 'PARTNER') && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{role === 'PARTNER' ? 'GSTIN' : 'SEBI ARN Number'}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={role === 'PARTNER' ? "27AAAAA0000A1Z5" : "ARN-123456"}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={businessId}
                        onChangeText={setBusinessId}
                        autoCapitalize="characters"
                    />
                    <Text style={styles.helpText}>This is required for verification.</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.mainBtn, saving && styles.mainBtnDisabled, { marginTop: 'auto' }]}
                disabled={saving}
                onPress={handleComplete}
            >
                {saving ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <>
                        <Text style={styles.mainBtnText}>Complete Setup</Text>
                        <ArrowRight size={20} color="black" />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0d0d0d', '#1a1a1a']} style={styles.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {step === 1 ? renderRoleSelection() : renderDetailsForm()}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0d0d0d' },
    background: { ...StyleSheet.absoluteFillObject },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 40 },
    stepContainer: { flex: 1, justifyContent: 'center' },
    backBtn: { alignSelf: 'flex-start', marginBottom: 20, paddingVertical: 8 },
    backBtnText: { color: '#d4af35', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 32, fontWeight: 'bold', color: '#d4af35', marginBottom: 8 },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32 },

    // Role Cards
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    roleCardActive: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderColor: '#d4af35',
    },
    iconBox: {
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16,
    },
    iconBoxActive: { backgroundColor: 'rgba(212, 175, 55, 0.2)' },
    roleInfo: { flex: 1 },
    roleTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 4 },
    textActive: { color: '#d4af35' },
    roleDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

    // Button
    mainBtn: {
        backgroundColor: '#d4af35',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        marginTop: 24,
        gap: 8,
    },
    mainBtnDisabled: { backgroundColor: '#333' },
    mainBtnText: { color: 'black', fontSize: 18, fontWeight: '700' },

    // Form
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12, padding: 16, color: 'white', fontSize: 16,
    },
    helpText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
    chipsContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 4,
    },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    },
    chipActive: { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: '#d4af35' },
    chipText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
    chipTextActive: { color: '#d4af35', fontWeight: 'bold' },
});
