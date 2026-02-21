import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Users, Search, Bell, ChevronRight, Activity, TrendingUp } from 'lucide-react-native';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { colors, gradients, glassmorphism } from '../theme';

export default function AdvisorDashboard({ navigation }) {
    const { user, logout } = useAuthStore();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user && useAuthStore.getState().token) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const res = await api.getAdvisorClients(user?.id);
            setClients(res.data.clients || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderClient = ({ item }) => (
        <TouchableOpacity
            style={styles.clientCard}
            onPress={() => navigation.navigate('AdvisorClientDetail', { client: item })}
        >
            <View style={styles.clientHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <Text style={styles.clientPhone}>{item.phone}</Text>
                </View>
                <View style={[styles.healthBadge, { backgroundColor: (item.healthScore || 0) < 40 ? 'rgba(231,76,60,0.2)' : 'rgba(76,175,80,0.2)' }]}>
                    <Activity size={12} color={(item.healthScore || 0) < 40 ? '#e74c3c' : '#4caf50'} />
                    <Text style={[styles.healthText, { color: (item.healthScore || 0) < 40 ? '#e74c3c' : '#4caf50' }]}>
                        {item.healthScore || 0}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0A0500', '#1A0D00']} style={styles.background} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
                    <Text style={styles.roleText}>Advisor Panel</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={logout}>
                    <Bell size={20} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Stats Overview */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.statsScroll}
                contentContainerStyle={{ paddingHorizontal: 20 }}
            >
                <View style={styles.statCard}>
                    <Users size={20} color={colors.accent} style={{ marginBottom: 8 }} />
                    <Text style={styles.statValue}>{clients.length}</Text>
                    <Text style={styles.statLabel}>Total Clients</Text>
                </View>
                <View style={styles.statCard}>
                    <Activity size={20} color={colors.success} style={{ marginBottom: 8 }} />
                    <Text style={styles.statValue}>
                        {clients.length ? Math.round(clients.reduce((acc, c) => acc + (c.healthScore || 0), 0) / clients.length) : 0}
                    </Text>
                    <Text style={styles.statLabel}>Avg Health</Text>
                </View>
                <View style={styles.statCard}>
                    <TrendingUp size={20} color={colors.info} style={{ marginBottom: 8 }} />
                    <Text style={styles.statValue}>12</Text>
                    <Text style={styles.statLabel}>Active Goals</Text>
                </View>
            </ScrollView>

            {/* Client List */}
            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>My Clients</Text>
                <FlatList
                    data={clients}
                    renderItem={renderClient}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
                    ListEmptyComponent={
                        !loading && <Text style={styles.emptyText}>No clients assigned yet.</Text>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0500' },
    background: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16
    },
    greeting: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
    roleText: { fontSize: 14, color: colors.accent, fontWeight: '600' },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },

    statsScroll: { maxHeight: 120, marginBottom: 20 },
    statCard: {
        width: 120, height: 100,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16, padding: 16, marginRight: 12,
        borderWidth: 1, borderColor: 'rgba(186, 143, 13, 0.15)',
        justifyContent: 'center'
    },
    statValue: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
    statLabel: { fontSize: 12, color: colors.textSecondary },

    listContainer: { flex: 1, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },

    clientCard: {
        ...glassmorphism.card,
        padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center'
    },
    clientHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(186, 143, 13, 0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: colors.accent },
    clientInfo: { flex: 1 },
    clientName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    clientPhone: { fontSize: 12, color: colors.textSecondary },
    healthBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12
    },
    healthText: { fontSize: 12, fontWeight: '700' },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40 }
});
