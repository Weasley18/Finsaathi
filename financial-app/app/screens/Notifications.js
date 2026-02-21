import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bell, Check, CheckCheck, Trash2, MessageSquare, TrendingUp, Phone, AlertTriangle, Info } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const typeConfig = {
    direct_message: { icon: MessageSquare, color: colors.info },
    recommendation: { icon: TrendingUp, color: colors.accent },
    recommendation_response: { icon: TrendingUp, color: colors.successLight },
    scheduled_call: { icon: Phone, color: colors.info },
    call_cancelled: { icon: Phone, color: colors.error },
    call_rescheduled: { icon: Phone, color: colors.warning },
    client_flag: { icon: AlertTriangle, color: colors.error },
};

export default function Notifications({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadNotifications(); }, []);

    const loadNotifications = async () => {
        try {
            const res = await api.getNotifications(50);
            setNotifications(res.data?.notifications || []);
            setUnreadCount(res.data?.unreadCount || 0);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const markRead = async (ids) => {
        try {
            await api.markNotificationsRead(ids);
            setNotifications(prev => prev.map(n =>
                ids.includes(n.id) ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - ids.length));
        } catch (err) { console.error(err); }
    };

    const markAllRead = async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) { console.error(err); }
    };

    const deleteNotif = async (id) => {
        try {
            await api.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) { console.error(err); }
    };

    const formatTime = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const getNotifType = (notif) => {
        try {
            const data = notif.data ? JSON.parse(notif.data) : {};
            return data.type || 'default';
        } catch { return 'default'; }
    };

    const renderItem = ({ item }) => {
        const nType = getNotifType(item);
        const config = typeConfig[nType] || { icon: Info, color: colors.textMuted };
        const Icon = config.icon;

        return (
            <View style={[glassmorphism.card, styles.notifCard, !item.isRead && { borderLeftWidth: 3, borderLeftColor: config.color }]}>
                <View style={[styles.notifIcon, { backgroundColor: config.color + '15' }]}>
                    <Icon size={18} color={config.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifMsg}>{item.message}</Text>
                    <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                </View>
                <View style={styles.notifActions}>
                    {!item.isRead && (
                        <TouchableOpacity onPress={() => markRead([item.id])} style={styles.iconBtn}>
                            <Check size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => deleteNotif(item.id)} style={styles.iconBtn}>
                        <Trash2 size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.headerTitle}>Notifications</Text>
                            {unreadCount > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>Stay updated</Text>
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                            <CheckCheck size={16} color={colors.accent} />
                            <Text style={{ fontSize: 12, color: colors.accent }}>Read All</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={notifications}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, gap: 10 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Bell size={48} color={colors.textMuted} strokeWidth={1} />
                                <Text style={styles.emptyText}>No notifications yet</Text>
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
    countBadge: {
        backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    },
    countBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    markAllBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(186,143,13,0.3)',
    },
    notifCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginBottom: 0,
    },
    notifIcon: {
        width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    notifTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
    notifMsg: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    notifTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    notifActions: { flexDirection: 'column', gap: 4 },
    iconBtn: { padding: 4 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
    emptyText: { color: colors.textMuted, fontSize: 14 },
});
