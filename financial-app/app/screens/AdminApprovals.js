import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    CheckCircle, XCircle, FileText, ChevronRight, User,
    Briefcase, Clock, ArrowLeft, X, RefreshCw,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

export default function AdminApprovals({ navigation }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [processing, setProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const res = await api.getPendingApprovals();
            setUsers((res.data || res).users || []);
        } catch (error) {
            console.error('Error fetching approvals', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleApprove = async () => {
        if (!selectedUser || processing) return;
        setProcessing(true);
        try {
            await api.approveUser(selectedUser.id);
            setUsers(users.filter(u => u.id !== selectedUser.id));
            setSelectedUser(null);
            Alert.alert('Success', 'User approved successfully');
        } catch (error) {
            console.error('Failed to approve', error);
            Alert.alert('Error', 'Failed to approve user');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedUser || !rejectReason.trim() || processing) return;
        setProcessing(true);
        try {
            await api.rejectUser(selectedUser.id, rejectReason);
            setUsers(users.filter(u => u.id !== selectedUser.id));
            setSelectedUser(null);
            setShowRejectInput(false);
            setRejectReason('');
            Alert.alert('Done', 'User rejected');
        } catch (error) {
            console.error('Failed to reject', error);
            Alert.alert('Error', 'Failed to reject user');
        } finally {
            setProcessing(false);
        }
    };

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
                    <Text style={styles.headerTitle}>Pending Approvals</Text>
                    <Text style={styles.headerSub}>Review advisor & partner applications</Text>
                </View>
                <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
                    <RefreshCw size={18} color={colors.textPrimary} />
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
                    </View>
                ) : users.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <CheckCircle size={48} color="#4CAF50" />
                        <Text style={styles.emptyTitle}>All caught up!</Text>
                        <Text style={styles.emptySubtitle}>No pending applications</Text>
                    </View>
                ) : (
                    users.map(u => (
                        <TouchableOpacity
                            key={u.id}
                            style={[styles.userCard, selectedUser?.id === u.id && styles.userCardSelected]}
                            onPress={() => setSelectedUser(u)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.userRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{(u.name || '?')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{u.name || 'N/A'}</Text>
                                    <Text style={styles.userPhone}>{u.phone}</Text>
                                </View>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>{(u.role || '').replace('_', ' ')}</Text>
                                </View>
                            </View>
                            <View style={styles.userMeta}>
                                <Clock size={12} color={colors.textMuted} />
                                <Text style={styles.metaText}>
                                    Applied {new Date(u.createdAt).toLocaleDateString('en-IN')}
                                </Text>
                                <View style={styles.pendingBadge}>
                                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Detail Modal */}
            <Modal visible={!!selectedUser} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Review Details</Text>
                            <TouchableOpacity onPress={() => { setSelectedUser(null); setShowRejectInput(false); }}>
                                <X size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {selectedUser && (
                            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                {/* Personal Info */}
                                <View style={styles.sectionHeader}>
                                    <User size={14} color={colors.textMuted} />
                                    <Text style={styles.sectionLabel}>Personal Info</Text>
                                </View>
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoLabel}>Full Name</Text>
                                    <Text style={styles.infoValue}>{selectedUser.name || 'Not provided'}</Text>
                                    <Text style={[styles.infoLabel, { marginTop: 12 }]}>Phone Number</Text>
                                    <Text style={styles.infoValue}>{selectedUser.phone}</Text>
                                </View>

                                {/* Credentials */}
                                <View style={styles.sectionHeader}>
                                    <Briefcase size={14} color={colors.textMuted} />
                                    <Text style={styles.sectionLabel}>Credentials</Text>
                                </View>
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoLabel}>Registration Type</Text>
                                    <Text style={styles.infoValue}>{selectedUser.role}</Text>
                                    <Text style={[styles.infoLabel, { marginTop: 12 }]}>ID Number (ARN / GSTIN)</Text>
                                    <Text style={[styles.infoValue, { color: colors.brightGold, fontWeight: '600' }]}>
                                        {selectedUser.businessId || 'Not provided'}
                                    </Text>
                                </View>

                                {/* Documents */}
                                <View style={styles.sectionHeader}>
                                    <FileText size={14} color={colors.textMuted} />
                                    <Text style={styles.sectionLabel}>Documents</Text>
                                </View>
                                {selectedUser.documents?.length > 0 ? (
                                    selectedUser.documents.map(doc => (
                                        <View key={doc.id} style={styles.docRow}>
                                            <View style={styles.docIcon}>
                                                <FileText size={18} color={colors.brightGold} />
                                            </View>
                                            <View>
                                                <Text style={styles.docName}>{doc.fileName}</Text>
                                                <Text style={styles.docType}>{doc.type}</Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noDocs}>No documents uploaded</Text>
                                )}
                            </ScrollView>
                        )}

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            {!showRejectInput ? (
                                <View style={styles.actionBtns}>
                                    <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={processing}>
                                        <CheckCircle size={18} color="#000" />
                                        <Text style={styles.approveBtnText}>{processing ? 'Processing...' : 'Approve'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => setShowRejectInput(true)}>
                                        <XCircle size={18} color="#ff4b4b" />
                                        <Text style={styles.rejectBtnText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View>
                                    <TextInput
                                        placeholder="Reason for rejection (e.g. Invalid ARN)..."
                                        placeholderTextColor={colors.textMuted}
                                        value={rejectReason}
                                        onChangeText={setRejectReason}
                                        multiline
                                        style={styles.rejectInput}
                                    />
                                    <View style={styles.actionBtns}>
                                        <TouchableOpacity
                                            style={[styles.approveBtn, { backgroundColor: '#ff4b4b' }]}
                                            onPress={handleReject}
                                            disabled={processing || !rejectReason.trim()}
                                        >
                                            <Text style={[styles.approveBtnText, { color: '#fff' }]}>
                                                {processing ? 'Processing...' : 'Confirm Rejection'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setShowRejectInput(false)}>
                                            <Text style={styles.cancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
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
    refreshBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12 },
    scrollContent: { padding: 20 },
    loadingContainer: { alignItems: 'center', paddingVertical: 80 },
    emptyCard: { ...glassmorphism.card, padding: 48, alignItems: 'center', gap: 12 },
    emptyTitle: { fontWeight: '600', color: colors.textPrimary, fontSize: 18 },
    emptySubtitle: { color: colors.textMuted, fontSize: 14 },
    userCard: {
        ...glassmorphism.card, padding: 16, marginBottom: 12,
    },
    userCardSelected: { borderColor: colors.brightGold },
    userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(186,143,13,0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    avatarText: { fontSize: 18, fontWeight: '700', color: colors.accent },
    userName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    userPhone: { fontSize: 12, color: colors.textSecondary },
    roleBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    roleBadgeText: { fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
    userMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12, color: colors.textMuted, flex: 1 },
    pendingBadge: {
        backgroundColor: 'rgba(212,175,55,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
    },
    pendingBadgeText: { fontSize: 10, fontWeight: '600', color: colors.brightGold },
    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#140F0A',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
        maxHeight: '85%', paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: { fontSize: 18, fontWeight: '600', color: colors.brightGold },
    modalScroll: { paddingHorizontal: 20, maxHeight: 400 },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 20, marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 12, fontWeight: '600', color: colors.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.5,
    },
    infoBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16 },
    infoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
    infoValue: { fontSize: 15, color: colors.textPrimary },
    docRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 8,
    },
    docIcon: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 8 },
    docName: { fontSize: 14, color: colors.textPrimary },
    docType: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' },
    noDocs: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 },
    modalActions: {
        paddingHorizontal: 20, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    },
    actionBtns: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    approveBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.brightGold, padding: 14, borderRadius: 10,
    },
    approveBtnText: { fontWeight: '600', color: '#000', fontSize: 15 },
    rejectBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderColor: 'rgba(255,75,75,0.4)', padding: 14, borderRadius: 10,
    },
    rejectBtnText: { fontWeight: '600', color: '#ff4b4b', fontSize: 15 },
    rejectInput: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1, borderColor: 'rgba(255,75,75,0.4)',
        color: '#fff', padding: 12, borderRadius: 8,
        marginBottom: 12, height: 80, textAlignVertical: 'top',
    },
    cancelText: { color: colors.textMuted, padding: 14, textAlign: 'center' },
});
