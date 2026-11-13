import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Dimensions, StatusBar
} from 'react-native';
import {
    TrendingUp, Calculator, IndianRupee, Clock, Target,
    ChevronLeft, Sparkles, ArrowRight, Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// SIP Calculation Engine
function calculateSIP(monthlyAmount, years, annualReturn) {
    const months = years * 12;
    const monthlyRate = annualReturn / 12 / 100;
    const futureValue = monthlyAmount * (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
    const invested = monthlyAmount * months;
    const gains = futureValue - invested;
    return { futureValue: Math.round(futureValue), invested, gains: Math.round(gains), months };
}

// Lump Sum Calculation
function calculateLumpSum(principal, years, annualReturn) {
    const futureValue = principal * Math.pow(1 + annualReturn / 100, years);
    return { futureValue: Math.round(futureValue), invested: principal, gains: Math.round(futureValue - principal) };
}

// Recommended Mutual Funds (curated for Indian users)
const RECOMMENDED_FUNDS = [
    { name: 'Nifty 50 Index Fund', category: 'Large Cap', risk: 'Moderate', returns: '12.5%', color: '#4CAF50', minSIP: 500 },
    { name: 'Parag Parikh Flexi Cap', category: 'Flexi Cap', risk: 'Moderate', returns: '15.2%', color: '#2196F3', minSIP: 1000 },
    { name: 'Quant Small Cap Fund', category: 'Small Cap', risk: 'High', returns: '18.7%', color: '#FF9800', minSIP: 1000 },
    { name: 'HDFC Balanced Advantage', category: 'Hybrid', risk: 'Low-Moderate', returns: '11.3%', color: '#9C27B0', minSIP: 500 },
    { name: 'SBI Liquid Fund', category: 'Debt', risk: 'Low', returns: '6.8%', color: '#607D8B', minSIP: 500 },
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];
const PRESET_YEARS = [1, 3, 5, 10, 15, 20, 25];

export default function SIPCalculator({ navigation }) {
    const { t } = useTranslation();
    const [mode, setMode] = useState('SIP'); // SIP | LUMPSUM
    const [amount, setAmount] = useState('5000');
    const [years, setYears] = useState(10);
    const [returnRate, setReturnRate] = useState(12);

    const result = useMemo(() => {
        const amt = parseInt(amount) || 0;
        if (amt <= 0 || years <= 0) return null;
        return mode === 'SIP'
            ? calculateSIP(amt, years, returnRate)
            : calculateLumpSum(amt, years, returnRate);
    }, [amount, years, returnRate, mode]);

    const formatCurrency = (val) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
        return `₹${val?.toLocaleString('en-IN') || 0}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#F5F0EB" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('sip.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                    {['SIP', 'LUMPSUM'].map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                            onPress={() => setMode(m)}
                        >
                            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                                {m === 'SIP' ? '📊 Monthly SIP' : '💰 Lump Sum'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Amount Input */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>
                        {mode === 'SIP' ? t('sip.monthlyInvestment') : 'One-time Investment'}
                    </Text>
                    <View style={styles.amountRow}>
                        <Text style={styles.rupeeSign}>₹</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="number-pad"
                            placeholder="5000"
                            placeholderTextColor="#6B5B44"
                        />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                        {PRESET_AMOUNTS.map(a => (
                            <TouchableOpacity
                                key={a}
                                style={[styles.presetChip, parseInt(amount) === a && styles.presetChipActive]}
                                onPress={() => setAmount(String(a))}
                            >
                                <Text style={[styles.presetText, parseInt(amount) === a && styles.presetTextActive]}>
                                    ₹{a >= 1000 ? `${a / 1000}K` : a}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Duration */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>{t('sip.timePeriod')}</Text>
                    <Text style={styles.durationValue}>{years} {years === 1 ? 'Year' : 'Years'}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                        {PRESET_YEARS.map(y => (
                            <TouchableOpacity
                                key={y}
                                style={[styles.presetChip, years === y && styles.presetChipActive]}
                                onPress={() => setYears(y)}
                            >
                                <Text style={[styles.presetText, years === y && styles.presetTextActive]}>
                                    {y}Y
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Expected Return Rate */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>{t('sip.expectedReturn')}</Text>
                    <Text style={styles.durationValue}>{returnRate}% p.a.</Text>
                    <View style={styles.returnPresets}>
                        {[8, 10, 12, 15, 18].map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.presetChip, returnRate === r && styles.presetChipActive]}
                                onPress={() => setReturnRate(r)}
                            >
                                <Text style={[styles.presetText, returnRate === r && styles.presetTextActive]}>
                                    {r}%
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Results Card */}
                {result && (
                    <View style={styles.resultsCard}>
                        <LinearGradient
                            colors={['rgba(186, 143, 13, 0.15)', 'rgba(186, 143, 13, 0.05)']}
                            style={styles.resultsGradient}
                        >
                            <Sparkles size={20} color="#D4AF37" />
                            <Text style={styles.resultsTitle}>
                                {mode === 'SIP' ? t('sip.futureValue') : 'Your Investment Will Grow To'}
                            </Text>

                            <Text style={styles.futureValue}>{formatCurrency(result.futureValue)}</Text>

                            <View style={styles.resultRow}>
                                <View style={styles.resultItem}>
                                    <Text style={styles.resultLabel}>
                                        {mode === 'SIP' ? t('sip.totalInvested') : 'Principal'}
                                    </Text>
                                    <Text style={styles.resultAmount}>{formatCurrency(result.invested)}</Text>
                                </View>
                                <View style={[styles.resultItem, { borderLeftWidth: 1, borderLeftColor: 'rgba(186,143,13,0.2)', paddingLeft: 20 }]}>
                                    <Text style={styles.resultLabel}>{t('sip.wealthGained')} ✨</Text>
                                    <Text style={[styles.resultAmount, { color: '#4CAF50' }]}>{formatCurrency(result.gains)}</Text>
                                </View>
                            </View>

                            {mode === 'SIP' && (
                                <View style={styles.powerChip}>
                                    <Info size={14} color="#D4AF37" />
                                    <Text style={styles.powerText}>
                                        Just ₹{parseInt(amount).toLocaleString('en-IN')}/month →{' '}
                                        {formatCurrency(result.futureValue)} in {years} years!
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                    </View>
                )}

                {/* Recommended Funds */}
                <View style={styles.sectionHeader}>
                    <TrendingUp size={18} color="#D4AF37" />
                    <Text style={styles.sectionTitle}>{t('sip.recommendedFunds')}</Text>
                </View>

                {RECOMMENDED_FUNDS.map((fund, idx) => (
                    <TouchableOpacity key={idx} style={styles.fundCard} activeOpacity={0.7}>
                        <View style={[styles.fundDot, { backgroundColor: fund.color }]} />
                        <View style={styles.fundInfo}>
                            <Text style={styles.fundName}>{fund.name}</Text>
                            <View style={styles.fundMeta}>
                                <Text style={styles.fundCategory}>{fund.category}</Text>
                                <Text style={styles.fundDivider}>•</Text>
                                <Text style={[styles.fundRisk, {
                                    color: fund.risk === 'Low' ? '#4CAF50' :
                                        fund.risk === 'Moderate' || fund.risk === 'Low-Moderate' ? '#FF9800' : '#e74c3c'
                                }]}>{fund.risk} Risk</Text>
                            </View>
                        </View>
                        <View style={styles.fundReturns}>
                            <Text style={styles.returnValue}>{fund.returns}</Text>
                            <Text style={styles.returnLabel}>3Y Returns</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0500' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(186,143,13,0.1)' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#F5F0EB' },
    scrollContent: { paddingHorizontal: 20 },

    modeToggle: {
        flexDirection: 'row', backgroundColor: '#1A0D00', borderRadius: 16,
        padding: 4, marginBottom: 20,
    },
    modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    modeBtnActive: { backgroundColor: 'rgba(186,143,13,0.15)' },
    modeBtnText: { fontSize: 14, fontWeight: '600', color: '#6B5B44' },
    modeBtnTextActive: { color: '#D4AF37' },

    card: {
        backgroundColor: 'rgba(26,13,0,0.75)', borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(186,143,13,0.15)',
        padding: 20, marginBottom: 16,
    },
    cardLabel: { fontSize: 12, color: '#B8A88A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
    amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    rupeeSign: { fontSize: 32, fontWeight: '800', color: '#D4AF37', marginRight: 8 },
    amountInput: {
        flex: 1, fontSize: 32, fontWeight: '800', color: '#F5F0EB',
        borderBottomWidth: 2, borderBottomColor: 'rgba(186,143,13,0.3)',
        paddingBottom: 4,
    },
    presetRow: { flexDirection: 'row', marginTop: 4 },
    presetChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: 'rgba(186,143,13,0.08)', marginRight: 8,
    },
    presetChipActive: { backgroundColor: 'rgba(186,143,13,0.25)', borderWidth: 1, borderColor: '#D4AF37' },
    presetText: { fontSize: 13, fontWeight: '600', color: '#6B5B44' },
    presetTextActive: { color: '#D4AF37' },

    durationValue: { fontSize: 28, fontWeight: '800', color: '#F5F0EB', marginBottom: 12 },
    returnPresets: { flexDirection: 'row', gap: 8 },

    resultsCard: { marginBottom: 24, borderRadius: 24, overflow: 'hidden' },
    resultsGradient: {
        padding: 24, borderRadius: 24,
        borderWidth: 1, borderColor: 'rgba(186,143,13,0.3)',
    },
    resultsTitle: { fontSize: 14, color: '#B8A88A', marginTop: 12, marginBottom: 8 },
    futureValue: { fontSize: 40, fontWeight: '900', color: '#D4AF37', marginBottom: 20 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between' },
    resultItem: { flex: 1 },
    resultLabel: { fontSize: 11, color: '#6B5B44', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    resultAmount: { fontSize: 18, fontWeight: '700', color: '#F5F0EB' },
    powerChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(186,143,13,0.1)', borderRadius: 12,
        padding: 12, marginTop: 16,
    },
    powerText: { fontSize: 12, color: '#D4AF37', flex: 1 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#F5F0EB' },

    fundCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(26,13,0,0.75)', borderRadius: 16,
        borderWidth: 1, borderColor: 'rgba(186,143,13,0.1)',
        padding: 16, marginBottom: 10,
    },
    fundDot: { width: 40, height: 40, borderRadius: 12, marginRight: 12 },
    fundInfo: { flex: 1 },
    fundName: { fontSize: 14, fontWeight: '700', color: '#F5F0EB', marginBottom: 4 },
    fundMeta: { flexDirection: 'row', alignItems: 'center' },
    fundCategory: { fontSize: 12, color: '#B8A88A' },
    fundDivider: { fontSize: 12, color: '#6B5B44', marginHorizontal: 6 },
    fundRisk: { fontSize: 12, fontWeight: '600' },
    fundReturns: { alignItems: 'flex-end' },
    returnValue: { fontSize: 16, fontWeight: '800', color: '#4CAF50' },
    returnLabel: { fontSize: 10, color: '#6B5B44', marginTop: 2 },
});
