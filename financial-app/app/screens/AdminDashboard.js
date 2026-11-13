import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    Users, TrendingUp, Shield, Activity, CheckCircle,
    BarChart3, Clock, ArrowLeft,
} from 'lucide-react-native';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { colors, gradients, glassmorphism } from '../theme';

const StatCard = ({ label, value, icon: Icon, color = colors.accent, subtext }) => (
    <View style={styles.statCard}>
        <View style={styles.statHeader}>
            <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{value ?? '—'}</Text>
                {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
            </View>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(186,143,13,0.1)' }]}>
                <Icon size={22} color={color} />
            </View>
        </View>
    </View>
);

export default function AdminDashboard({ navigation }) {
    const { user, logout } = useAuthStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const res = await api.getAdminStats();
            setData(res.data || res);
        } catch (error) {
            console.error('Failed to load admin stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const stats = data?.stats || {};
    const activities = data?.recentActivity || [];
    const roleDistribution = data?.roleDistribution || [];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0A0500', '#1A0D00']} style={styles.background} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Admin Panel</Text>
                    <Text style={styles.roleText}>Platform Dashboard</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={logout}>
                    <ArrowLeft size={20} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brightGold} />}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.loadingText}>Loading platform stats...</Text>
                    </View>
                ) : !data ? (
                    <View style={styles.emptyCard}>
                        <BarChart3 size={48} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>Unable to load platform stats</Text>
                        <Text style={styles.emptySubtitle}>Please try again later</Text>
                    </View>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <StatCard label="Total Users" value={stats.totalUsers?.toLocaleString()} icon={Users} />
                            <StatCard
                                label="Advisors" value={stats.totalAdvisors}
                                icon={Shield} color="#4CAF50"
                                subtext={stats.pendingApprovals ? `${stats.pendingApprovals} pending` : undefined}
                            />
                            <StatCard label="Active Today" value={stats.activeToday} icon={Activity} color="#2196F3" />
                            <StatCard label="Transactions" value={stats.transactions?.toLocaleString()} icon={TrendingUp} color="#FF9800" />
                            <StatCard
                                label="Avg Health" value={stats.avgHealth != null ? stats.avgHealth : '—'}
                                icon={CheckCircle} color="#4CAF50"
                            />
                        </View>

                        {/* Quick Actions */}
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => navigation.navigate('AdminApprovals')}
                            >
                                <Shield size={20} color={colors.accent} />
                                <Text style={styles.actionText}>Approvals</Text>
                                {stats.pendingApprovals > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{stats.pendingApprovals}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => navigation.navigate('AdminAdvisors')}
                            >
                                <Users size={20} color={colors.accent} />
                                <Text style={styles.actionText}>Advisors</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => navigation.navigate('AdminContent')}
                            >
                                <BarChart3 size={20} color={colors.accent} />
                                <Text style={styles.actionText}>Content</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Role Distribution */}
                        {roleDistribution.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Role Distribution</Text>
                                <View style={[styles.distributionCard, glassmorphism.card]}>
                                    {roleDistribution.map((role, i) => {
                                        const total = roleDistribution.reduce((s, r) => s + (r.value || 0), 0);
                                        const pct = total > 0 ? Math.round((role.value / total) * 100) : 0;
                                        const roleColors = ['#D4AF37', '#4CAF50', '#2196F3', '#F44336'];
                                        return (
                                            <View key={role.name} style={styles.distributionRow}>
                                                <View style={styles.distributionLabel}>
                                                    <View style={[styles.colorDot, { backgroundColor: roleColors[i] }]} />
                                                    <Text style={styles.roleName}>{role.name}</Text>
                                                </View>
                                                <View style={styles.distributionBarBg}>
                                                    <View style={[styles.distributionBarFill, { width: `${pct}%`, backgroundColor: roleColors[i] }]} />
                                                </View>
                                                <Text style={styles.roleValue}>{role.value}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Activity Feed */}
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <View style={[styles.activityCard, glassmorphism.card]}>
                            {activities.length > 0 ? (
                                activities.slice(0, 8).map((act, i) => (
                                    <View key={i} style={styles.activityRow}>
                                        <View style={[styles.activityDot, {
                                            backgroundColor: act.type === 'success' ? '#4CAF50' : act.type === 'warning' ? '#FF9800' : '#2196F3'
                                        }]} />
                                        <Text style={styles.activityText} numberOfLines={2}>{act.text}</Text>
                                        <Text style={styles.activityTime}>{act.time}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noActivity}>No recent activity</Text>
                            )}
                        </View>
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    greeting: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
    roleText: { fontSize: 14, color: colors.accent, fontWeight: '600' },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
    scrollContent: { padding: 20 },
    loadingContainer: { alignItems: 'center', paddingVertical: 80, gap: 12 },
    loadingText: { color: colors.textMuted, fontSize: 14 },
    emptyCard: {
        ...glassmorphism.card, padding: 48, alignItems: 'center', gap: 12,
    },
    emptyTitle: { fontWeight: '600', color: colors.textSecondary, fontSize: 16 },
    emptySubtitle: { color: colors.textMuted, fontSize: 14 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statCard: {
        width: '47%',
        ...glassmorphism.card,
        padding: 16,
    },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    statLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
    statValue: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
    statSubtext: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    statIconBox: { padding: 10, borderRadius: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 14 },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionCard: {
        flex: 1, alignItems: 'center', gap: 8,
        ...glassmorphism.card, padding: 16,
    },
    actionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    badge: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: '#F44336', borderRadius: 10,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
    distributionCard: { padding: 20, marginBottom: 24 },
    distributionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    distributionLabel: { flexDirection: 'row', alignItems: 'center', width: 100, gap: 6 },
    colorDot: { width: 10, height: 10, borderRadius: 5 },
    roleName: { fontSize: 12, color: colors.textSecondary },
    distributionBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
    distributionBarFill: { height: '100%', borderRadius: 4 },
    roleValue: { width: 30, textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    activityCard: { padding: 16, marginBottom: 24 },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    activityDot: { width: 8, height: 8, borderRadius: 4 },
    activityText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    activityTime: { fontSize: 11, color: colors.textMuted },
    noActivity: { textAlign: 'center', color: colors.textMuted, padding: 24 },
});
