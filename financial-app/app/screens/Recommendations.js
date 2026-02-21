import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, TrendingUp, Check, X, Eye, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const FILTERS = ['all', 'pending', 'accepted', 'dismissed'];
const catColors = { savings: '#27ae60', investment: '#3498db', insurance: '#9b59b6', debt: '#e74c3c', general: '#D4AF37' };
const statusIcons = { pending: Clock, viewed: Eye, accepted: Check, dismissed: X };

export default function Recommendations({ navigation }) {
    const [recs, setRecs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadRecs(); }, []);

    const loadRecs = async () => {
        try {
            const res = await api.getRecommendations();
            setRecs(res.data?.recommendations || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.updateRecommendationStatus(id, status);
            setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch (err) { console.error(err); }
    };

    const filtered = filter === 'all' ? recs : recs.filter(r => r.status === filter);

    const renderItem = ({ item }) => {
        const catColor = catColors[item.category] || catColors.general;
        const StatusIcon = statusIcons[item.status] || Clock;

        return (
            <View style={[glassmorphism.card, styles.card]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.catBadge, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
                        <Text style={[styles.catText, { color: catColor }]}>{item.category}</Text>
                    </View>
                    <StatusIcon size={16} color={colors.textMuted} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardContent} numberOfLines={3}>{item.content}</Text>
                {item.advisor && (
                    <Text style={styles.advisorName}>From: {item.advisor.name}</Text>
                )}
                {(item.status === 'pending' || item.status === 'viewed') && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#27ae6020', borderColor: '#27ae6040' }]}
                            onPress={() => updateStatus(item.id, 'accepted')}
                        >
                            <Check size={16} color="#27ae60" />
                            <Text style={[styles.actionText, { color: '#27ae60' }]}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#e74c3c20', borderColor: '#e74c3c40' }]}
                            onPress={() => updateStatus(item.id, 'dismissed')}
                        >
                            <X size={16} color="#e74c3c" />
                            <Text style={[styles.actionText, { color: '#e74c3c' }]}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar style="light" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Recommendations</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>From your financial advisor</Text>
                    </View>
                    <TrendingUp size={24} color={colors.accent} />
                </View>

                {/* Filter tabs */}
                <View style={styles.filters}>
                    {FILTERS.map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterTab, filter === f && styles.filterTabActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filtered}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, gap: 12 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <TrendingUp size={40} color={colors.textMuted} strokeWidth={1} />
                                <Text style={styles.emptyText}>No recommendations yet</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    filters: {
        flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    },
    filterTab: {
        paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
        backgroundColor: 'rgba(28,10,0,0.6)', borderWidth: 1, borderColor: colors.cardBorder,
    },
    filterTabActive: { backgroundColor: 'rgba(186,143,13,0.15)', borderColor: colors.accent },
    filterText: { fontSize: 12, color: colors.textMuted },
    filterTextActive: { color: colors.accent, fontWeight: '600' },
    card: { padding: 16, marginBottom: 0 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    catBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
    catText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
    cardContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    advisorName: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    },
    actionText: { fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
    emptyText: { color: colors.textMuted, fontSize: 14 },
});
