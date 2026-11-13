import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    ArrowLeft, Package, Users, FileText, CheckCircle,
    TrendingUp, ArrowUpRight,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PartnerDashboard({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [dRes, aRes] = await Promise.all([
                api.getPartnerDashboard(),
                api.getPartnerAnalytics(),
            ]);
            setDashboard((dRes.data || dRes));
            setAnalytics((aRes.data || aRes));
        } catch (e) {
            console.error('Error fetching partner data', e);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const stats = [
        { label: 'Products', value: dashboard?.totalProducts ?? 0, icon: Package, color: '#4FC3F7' },
        { label: 'Matched Users', value: dashboard?.matchedUsers ?? 0, icon: Users, color: '#A5D6A7' },
        { label: 'Applications', value: dashboard?.applications ?? 0, icon: FileText, color: colors.brightGold },
        { label: 'Onboarded', value: dashboard?.onboarded ?? 0, icon: CheckCircle, color: '#CE93D8' },
    ];

    const conversionRate = dashboard?.applications
        ? Math.round(((dashboard?.onboarded || 0) / dashboard.applications) * 100)
        : 0;

    const funnelStages = [
        { label: 'Eligible Users', value: dashboard?.matchedUsers ?? 0 },
        { label: 'Applications', value: dashboard?.applications ?? 0 },
        { label: 'Approved', value: dashboard?.approved ?? dashboard?.onboarded ?? 0 },
        { label: 'Onboarded', value: dashboard?.onboarded ?? 0 },
    ];

    const maxFunnel = Math.max(...funnelStages.map(s => s.value), 1);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0A0500', '#1A0D00']} style={styles.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Partner Dashboard</Text>
                    <Text style={styles.headerSub}>Product performance & user metrics</Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('PartnerProducts')}
                    style={styles.productsBtn}
                >
                    <Package size={16} color="#000" />
                    <Text style={styles.productsBtnText}>Products</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brightGold} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 80 }} />
                ) : (
                    <>
                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            {stats.map((s, i) => (
                                <View key={i} style={styles.statCard}>
                                    <View style={[styles.statIcon, { backgroundColor: `${s.color}20` }]}>
                                        <s.icon size={18} color={s.color} />
                                    </View>
                                    <Text style={styles.statValue}>{s.value}</Text>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Conversion Rate */}
                        <View style={styles.conversionCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={18} color={colors.brightGold} />
                                <Text style={styles.sectionTitle}>Conversion Rate</Text>
                            </View>
                            <Text style={styles.conversionValue}>{conversionRate}%</Text>
                            <View style={styles.conversionBarBg}>
                                <View style={[styles.conversionBarFill, { width: `${Math.min(conversionRate, 100)}%` }]} />
                            </View>
                            <Text style={styles.conversionHint}>
                                Applications to onboarded users
                            </Text>
                        </View>

                        {/* Uptake Funnel */}
                        <View style={styles.funnelCard}>
                            <Text style={styles.sectionTitle}>Uptake Funnel</Text>
                            <Text style={styles.sectionSub}>User journey through your products</Text>
                            <View style={{ marginTop: 16 }}>
                                {funnelStages.map((stage, i) => {
                                    const barW = Math.max((stage.value / maxFunnel) * 100, 10);
                                    return (
                                        <View key={i} style={styles.funnelRow}>
                                            <Text style={styles.funnelLabel}>{stage.label}</Text>
                                            <View style={styles.funnelBarBg}>
                                                <LinearGradient
                                                    colors={['rgba(212,175,55,0.6)', 'rgba(212,175,55,0.15)']}
                                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                    style={[styles.funnelBarFill, { width: `${barW}%` }]}
                                                />
                                            </View>
                                            <Text style={styles.funnelValue}>{stage.value}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Income Distribution */}
                        {analytics?.incomeDistribution?.length > 0 && (
                            <View style={styles.distributionCard}>
                                <Text style={styles.sectionTitle}>Income Distribution</Text>
                                <Text style={styles.sectionSub}>Matched users by income bracket</Text>
                                <View style={{ marginTop: 16 }}>
                                    {analytics.incomeDistribution.map((item, i) => {
                                        const maxVal = Math.max(...analytics.incomeDistribution.map(d => d.count || d.value || 0), 1);
                                        const val = item.count || item.value || 0;
                                        return (
                                            <View key={i} style={styles.distRow}>
                                                <Text style={styles.distLabel}>{item.bracket || item.label || `Bracket ${i + 1}`}</Text>
                                                <View style={styles.distBarBg}>
                                                    <View
                                                        style={[styles.distBarFill, {
                                                            width: `${(val / maxVal) * 100}%`,
                                                            backgroundColor: ['#4FC3F7', '#A5D6A7', colors.brightGold, '#CE93D8', '#FFB74D'][i % 5],
                                                        }]}
                                                    />
                                                </View>
                                                <Text style={styles.distValue}>{val}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Recent Matches */}
                        {dashboard?.recentMatches?.length > 0 && (
                            <View style={styles.matchesCard}>
                                <Text style={styles.sectionTitle}>Recent Matches</Text>
                                <Text style={styles.sectionSub}>Latest users matched to your products</Text>
                                {dashboard.recentMatches.slice(0, 6).map((m, i) => (
                                    <View key={i} style={styles.matchRow}>
                                        <View style={styles.matchAvatar}>
                                            <Text style={styles.matchAvatarText}>{(m.userName || '?')[0].toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.matchName}>{m.userName || 'User'}</Text>
                                            <Text style={styles.matchProduct}>{m.productName || 'Product'}</Text>
                                        </View>
                                        <View style={[
                                            styles.matchStatus,
                                            m.status === 'ONBOARDED' ? styles.onboardedStatus : styles.pendingStatus,
                                        ]}>
                                            <Text style={[
                                                styles.matchStatusText,
                                                m.status === 'ONBOARDED' ? styles.onboardedText : styles.pendingText,
                                            ]}>
                                                {m.status || 'MATCHED'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0500' },
    background: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 16,
    },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textSecondary },
    productsBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.brightGold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    },
    productsBtnText: { fontWeight: '600', color: '#000', fontSize: 13 },
    scrollContent: { padding: 20 },
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
    },
    statCard: {
        width: (SCREEN_WIDTH - 50) / 2 - 5,
        ...glassmorphism.card, padding: 16, alignItems: 'center',
    },
    statIcon: { padding: 8, borderRadius: 10, marginBottom: 8 },
    statValue: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    // Conversion
    conversionCard: { ...glassmorphism.card, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    sectionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    conversionValue: { fontSize: 36, fontWeight: '700', color: colors.brightGold, marginTop: 8 },
    conversionBarBg: {
        height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 8,
    },
    conversionBarFill: {
        height: 6, backgroundColor: colors.brightGold, borderRadius: 3,
    },
    conversionHint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
    // Funnel
    funnelCard: { ...glassmorphism.card, padding: 20, marginBottom: 16 },
    funnelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    funnelLabel: { width: 90, fontSize: 11, color: colors.textSecondary },
    funnelBarBg: {
        flex: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden',
    },
    funnelBarFill: { height: '100%', borderRadius: 4 },
    funnelValue: { width: 40, fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
    // Distribution
    distributionCard: { ...glassmorphism.card, padding: 20, marginBottom: 16 },
    distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    distLabel: { width: 80, fontSize: 11, color: colors.textSecondary },
    distBarBg: { flex: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' },
    distBarFill: { height: '100%', borderRadius: 3 },
    distValue: { width: 36, fontSize: 12, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
    // Matches
    matchesCard: { ...glassmorphism.card, padding: 20, marginBottom: 16 },
    matchRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    matchAvatar: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(186,143,13,0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    matchAvatarText: { fontSize: 14, fontWeight: '700', color: colors.accent },
    matchName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    matchProduct: { fontSize: 11, color: colors.textMuted },
    matchStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    onboardedStatus: { backgroundColor: 'rgba(76,175,80,0.2)' },
    pendingStatus: { backgroundColor: 'rgba(212,175,55,0.2)' },
    matchStatusText: { fontSize: 10, fontWeight: '600' },
    onboardedText: { color: '#4CAF50' },
    pendingText: { color: colors.brightGold },
});
