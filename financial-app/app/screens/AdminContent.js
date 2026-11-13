import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Modal, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    ArrowLeft, Plus, BookOpen, Building2, Edit3, Trash2, X,
    CheckCircle, FileText,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

export default function AdminContent({ navigation }) {
    const [activeTab, setActiveTab] = useState('lessons');
    const [lessons, setLessons] = useState([]);
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ title: '', body: '', category: '', active: true });

    const fetchData = useCallback(async () => {
        try {
            const [lRes, sRes] = await Promise.all([api.getAllLessons(), api.getAllSchemes()]);
            setLessons(((lRes.data || lRes).lessons || []).sort((a, b) => b.id - a.id));
            setSchemes(((sRes.data || sRes).schemes || []).sort((a, b) => b.id - a.id));
        } catch (e) {
            console.error('Error fetching content', e);
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

    const openCreate = () => {
        setEditItem(null);
        setForm({ title: '', body: '', category: '', active: true });
        setModalVisible(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({
            title: item.title || item.name || '',
            body: item.body || item.description || '',
            category: item.category || item.type || '',
            active: item.active !== false,
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        try {
            if (activeTab === 'lessons') {
                const payload = { title: form.title, body: form.body, category: form.category, active: form.active };
                if (editItem) {
                    await api.updateLesson(editItem.id, payload);
                } else {
                    await api.createLesson(payload);
                }
            } else {
                const payload = {
                    name: form.title, description: form.body,
                    type: form.category, active: form.active,
                };
                if (editItem) {
                    await api.updateScheme(editItem.id, payload);
                } else {
                    await api.createScheme(payload);
                }
            }
            setModalVisible(false);
            await fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to save');
        }
    };

    const handleDelete = (item) => {
        Alert.alert('Delete', `Are you sure you want to delete "${item.title || item.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        if (activeTab === 'lessons') await api.deleteLesson(item.id);
                        else await api.deleteScheme(item.id);
                        await fetchData();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                },
            },
        ]);
    };

    const data = activeTab === 'lessons' ? lessons : schemes;
    const tabLabel = activeTab === 'lessons' ? 'Lesson' : 'Scheme';

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
                    <Text style={styles.headerTitle}>Content Management</Text>
                    <Text style={styles.headerSub}>Manage lessons & government schemes</Text>
                </View>
                <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
                    <Plus size={20} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {[
                    { key: 'lessons', label: 'Lessons', icon: BookOpen },
                    { key: 'schemes', label: 'Schemes', icon: Building2 },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <tab.icon size={16} color={activeTab === tab.key ? '#000' : colors.textMuted} />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brightGold} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 80 }} />
                ) : data.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <FileText size={48} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>No {activeTab} yet</Text>
                        <Text style={styles.emptySubtitle}>Tap + to create your first {tabLabel.toLowerCase()}</Text>
                    </View>
                ) : (
                    data.map(item => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{item.title || item.name}</Text>
                                    <Text style={styles.cardCategory}>{item.category || item.type || 'General'}</Text>
                                </View>
                                <View style={[styles.statusBadge, item.active !== false ? styles.activeBadge : styles.draftBadge]}>
                                    <Text style={[styles.statusText, item.active !== false ? styles.activeText : styles.draftText]}>
                                        {item.active !== false ? 'ACTIVE' : 'DRAFT'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.cardBody} numberOfLines={2}>
                                {item.body || item.description || 'No description.'}
                            </Text>
                            <View style={styles.cardActions}>
                                <Text style={styles.dateText}>
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : ''}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                                        <Edit3 size={16} color={colors.brightGold} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                                        <Trash2 size={16} color="#ff4b4b" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Create/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editItem ? `Edit ${tabLabel}` : `New ${tabLabel}`}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.fieldLabel}>{activeTab === 'lessons' ? 'Title' : 'Name'}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.title}
                                onChangeText={v => setForm({ ...form, title: v })}
                                placeholder={`Enter ${tabLabel.toLowerCase()} title`}
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.fieldLabel}>{activeTab === 'lessons' ? 'Body' : 'Description'}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={form.body}
                                onChangeText={v => setForm({ ...form, body: v })}
                                placeholder={`Write ${tabLabel.toLowerCase()} content...`}
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />

                            <Text style={styles.fieldLabel}>{activeTab === 'lessons' ? 'Category' : 'Type'}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.category}
                                onChangeText={v => setForm({ ...form, category: v })}
                                placeholder="e.g. budgeting, savings, insurance"
                                placeholderTextColor={colors.textMuted}
                            />

                            <View style={styles.switchRow}>
                                <Text style={styles.fieldLabel}>Active</Text>
                                <Switch
                                    value={form.active}
                                    onValueChange={v => setForm({ ...form, active: v })}
                                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(212,175,55,0.4)' }}
                                    thumbColor={form.active ? colors.brightGold : '#666'}
                                />
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>{editItem ? 'Update' : 'Create'} {tabLabel}</Text>
                        </TouchableOpacity>
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
    addBtn: {
        padding: 8, backgroundColor: colors.brightGold, borderRadius: 12,
    },
    tabs: {
        flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 8,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    },
    tabActive: { backgroundColor: colors.brightGold },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: '#000' },
    scrollContent: { padding: 20 },
    emptyCard: { ...glassmorphism.card, padding: 52, alignItems: 'center', gap: 12 },
    emptyTitle: { fontWeight: '600', color: colors.textPrimary, fontSize: 17 },
    emptySubtitle: { color: colors.textMuted, fontSize: 13 },
    card: { ...glassmorphism.card, padding: 16, marginBottom: 12 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    cardCategory: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    activeBadge: { backgroundColor: 'rgba(76,175,80,0.2)' },
    draftBadge: { backgroundColor: 'rgba(255,255,255,0.08)' },
    statusText: { fontSize: 10, fontWeight: '600' },
    activeText: { color: '#4CAF50' },
    draftText: { color: colors.textMuted },
    cardBody: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: 12 },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateText: { fontSize: 11, color: colors.textMuted },
    iconBtn: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 8 },
    deleteBtn: { backgroundColor: 'rgba(255,75,75,0.1)' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#140F0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
        maxHeight: '80%', paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: { fontSize: 18, fontWeight: '600', color: colors.brightGold },
    modalScroll: { paddingHorizontal: 20 },
    fieldLabel: {
        fontSize: 12, fontWeight: '600', color: colors.textSecondary,
        textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10, padding: 12, color: '#fff', fontSize: 14,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    switchRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
    },
    saveBtn: {
        backgroundColor: colors.brightGold, marginHorizontal: 20,
        marginTop: 20, padding: 14, borderRadius: 10, alignItems: 'center',
    },
    saveBtnText: { fontWeight: '600', color: '#000', fontSize: 15 },
});
