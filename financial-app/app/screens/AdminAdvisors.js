import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    ArrowLeft, Users, Star, Award, Search, ChevronUp,
    ChevronDown, UserPlus, X, Filter,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const FILTERS = ['ALL', 'PREMIUM', 'FREE'];

export default function AdminAdvisors({ navigation }) {
    const [advisors, setAdvisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [assignModal, setAssignModal] = useState(false);
    const [selectedAdvisor, setSelectedAdvisor] = useState(null);
    const [clientPhone, setClientPhone] = useState('');
    const [processing, setProcessing] = useState(false);

    // Stats
    const [stats, setStats] = useState({ total: 0, premium: 0, free: 0, avgClients: 0 });

    const fetchData = useCallback(async () => {
        try {
            const res = await api.getAdvisors();
            const list = (res.data || res).advisors || [];
            setAdvisors(list);
            const premium = list.filter(a => a.tier === 'PREMIUM').length;
            const free = list.length - premium;
            const avgClients = list.length
                ? Math.round(list.reduce((s, a) => s + (a._count?.clients || a.clientCount || 0), 0) / list.length)
                : 0;
            setStats({ total: list.length, premium, free, avgClients });
        } catch (e) {
            console.error('Error fetching advisors', e);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleTierChange = async (advisorId, tier) => {
        try {
            await api.updateAdvisorTier(advisorId, tier);
            await fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to update tier');
        }
    };

    const handleAssign = async () => {
        if (!selectedAdvisor || !clientPhone.trim() || processing) return;
        setProcessing(true);
        try {
            await api.assignClient(selectedAdvisor.id, clientPhone.trim());
            setAssignModal(false);
            setClientPhone('');
            Alert.alert('Success', 'Client assigned successfully');
            await fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to assign client');
        } finally { setProcessing(false); }
    };

    const filtered = advisors.filter(a => {
        if (filter === 'PREMIUM' && a.tier !== 'PREMIUM') return false;
        if (filter === 'FREE' && a.tier === 'PREMIUM') return false;
        if (search) {
            const q = search.toLowerCase();
            return (a.name || '').toLowerCase().includes(q) || (a.phone || '').includes(q);
        }
        return true;
    });

    const StatCard = ({ label, value, icon: Icon, color }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
                <Icon size={16} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

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
                    <Text style={styles.headerTitle}>Advisor Management</Text>
                    <Text style={styles.headerSub}>Manage tiers & client assignments</Text>
                </View>
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
                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <StatCard label="Total" value={stats.total} icon={Users} color="#4FC3F7" />
                            <StatCard label="Premium" value={stats.premium} icon={Star} color={colors.brightGold} />
                            <StatCard label="Free" value={stats.free} icon={Users} color="#A5D6A7" />
                            <StatCard label="Avg Clients" value={stats.avgClients} icon={Award} color="#CE93D8" />
                        </View>

                        {/* Search + Filter */}
                        <View style={styles.searchRow}>
                            <View style={styles.searchBox}>
                                <Search size={16} color={colors.textMuted} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search advisors..."
                                    placeholderTextColor={colors.textMuted}
                                    value={search}
                                    onChangeText={setSearch}
                                />
                            </View>
                        </View>
                        <View style={styles.filterRow}>
                            {FILTERS.map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterChip, filter === f && styles.filterChipActive]}
                                    onPress={() => setFilter(f)}
                                >
                                    <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Advisor List */}
                        {filtered.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Users size={40} color={colors.textMuted} />
                                <Text style={styles.emptyTitle}>No advisors found</Text>
                            </View>
                        ) : (
                            filtered.map(a => (
                                <View key={a.id} style={styles.advisorCard}>
                                    <View style={styles.advisorTop}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{(a.name || '?')[0].toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.advisorName}>{a.name || 'Unnamed'}</Text>
                                            <Text style={styles.advisorPhone}>{a.phone}</Text>
                                        </View>
                                        <View style={[styles.tierBadge, a.tier === 'PREMIUM' ? styles.premiumBadge : styles.freeBadge]}>
                                            <Text style={[styles.tierText, a.tier === 'PREMIUM' ? styles.premiumText : styles.freeText]}>
                                                {a.tier || 'FREE'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.advisorMeta}>
                                        <Text style={styles.metaItem}>
                                            Clients: {a._count?.clients || a.clientCount || 0}
                                        </Text>
                                        <Text style={styles.metaItem}>
                                            Rating: {a.rating || 'N/A'}
                                        </Text>
                                    </View>

                                    <View style={styles.advisorActions}>
                                        {a.tier === 'PREMIUM' ? (
                                            <TouchableOpacity
                                                style={[styles.actionChip, { borderColor: 'rgba(255,75,75,0.4)' }]}
                                                onPress={() => handleTierChange(a.id, 'FREE')}
                                            >
                                                <ChevronDown size={14} color="#ff4b4b" />
                                                <Text style={[styles.actionChipText, { color: '#ff4b4b' }]}>Downgrade</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.actionChip, { borderColor: 'rgba(212,175,55,0.4)' }]}
                                                onPress={() => handleTierChange(a.id, 'PREMIUM')}
                                            >
                                                <ChevronUp size={14} color={colors.brightGold} />
                                                <Text style={[styles.actionChipText, { color: colors.brightGold }]}>Upgrade</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.actionChip, { borderColor: 'rgba(79,195,247,0.4)' }]}
                                            onPress={() => { setSelectedAdvisor(a); setAssignModal(true); }}
                                        >
                                            <UserPlus size={14} color="#4FC3F7" />
                                            <Text style={[styles.actionChipText, { color: '#4FC3F7' }]}>Assign</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Assign Client Modal */}
            <Modal visible={assignModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign Client</Text>
                            <TouchableOpacity onPress={() => setAssignModal(false)}>
                                <X size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.modalDesc}>
                                Assign a client to <Text style={{ color: colors.brightGold, fontWeight: '600' }}>{selectedAdvisor?.name}</Text>
                            </Text>
                            <Text style={styles.fieldLabel}>Client Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={clientPhone}
                                onChangeText={setClientPhone}
                                placeholder="Enter client phone number"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                            />
                            <TouchableOpacity style={styles.assignBtn} onPress={handleAssign} disabled={processing}>
                                <Text style={styles.assignBtnText}>{processing ? 'Assigning...' : 'Assign Client'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    scrollContent: { padding: 20 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: {
        flex: 1, ...glassmorphism.card, padding: 12, alignItems: 'center',
    },
    statIcon: { padding: 6, borderRadius: 8, marginBottom: 6 },
    statValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    searchRow: { marginBottom: 12 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: { flex: 1, color: '#fff', fontSize: 14 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    filterChip: {
        paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    filterChipActive: { backgroundColor: colors.brightGold },
    filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    filterChipTextActive: { color: '#000' },
    emptyCard: { ...glassmorphism.card, padding: 52, alignItems: 'center', gap: 12 },
    emptyTitle: { fontWeight: '600', color: colors.textPrimary, fontSize: 16 },
    advisorCard: { ...glassmorphism.card, padding: 16, marginBottom: 12 },
    advisorTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(186,143,13,0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    avatarText: { fontSize: 18, fontWeight: '700', color: colors.accent },
    advisorName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    advisorPhone: { fontSize: 12, color: colors.textSecondary },
    tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    premiumBadge: { backgroundColor: 'rgba(212,175,55,0.2)' },
    freeBadge: { backgroundColor: 'rgba(255,255,255,0.08)' },
    tierText: { fontSize: 11, fontWeight: '600' },
    premiumText: { color: colors.brightGold },
    freeText: { color: colors.textMuted },
    advisorMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    metaItem: { fontSize: 12, color: colors.textMuted },
    advisorActions: { flexDirection: 'row', gap: 10 },
    actionChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        borderWidth: 1,
    },
    actionChipText: { fontSize: 12, fontWeight: '600' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#140F0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: { fontSize: 18, fontWeight: '600', color: colors.brightGold },
    modalBody: { padding: 20 },
    modalDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
    fieldLabel: {
        fontSize: 12, fontWeight: '600', color: colors.textSecondary,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 20,
    },
    assignBtn: {
        backgroundColor: colors.brightGold, padding: 14, borderRadius: 10, alignItems: 'center',
    },
    assignBtnText: { fontWeight: '600', color: '#000', fontSize: 15 },
});
