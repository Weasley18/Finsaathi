import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    ArrowLeft, Plus, Edit3, Trash2, X, Package,
    DollarSign, Percent, Users,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const PRODUCT_TYPES = ['microloan', 'insurance', 'savings_account', 'scheme', 'fixed_deposit'];

export default function PartnerProducts({ navigation }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({
        name: '', description: '', type: 'microloan',
        interestRate: '', minAmount: '', maxAmount: '',
    });

    const fetchData = useCallback(async () => {
        try {
            const res = await api.getPartnerProducts();
            setProducts(((res.data || res).products || []).sort((a, b) => b.id - a.id));
        } catch (e) {
            console.error('Error fetching products', e);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const openCreate = () => {
        setEditItem(null);
        setForm({ name: '', description: '', type: 'microloan', interestRate: '', minAmount: '', maxAmount: '' });
        setModalVisible(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({
            name: item.name || '',
            description: item.description || '',
            type: item.type || 'microloan',
            interestRate: item.interestRate != null ? String(item.interestRate) : '',
            minAmount: item.minAmount != null ? String(item.minAmount) : '',
            maxAmount: item.maxAmount != null ? String(item.maxAmount) : '',
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            Alert.alert('Validation', 'Product name is required');
            return;
        }
        try {
            const payload = {
                name: form.name,
                description: form.description,
                type: form.type,
                interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
                minAmount: form.minAmount ? parseInt(form.minAmount) : null,
                maxAmount: form.maxAmount ? parseInt(form.maxAmount) : null,
            };
            if (editItem) {
                await api.updatePartnerProduct(editItem.id, payload);
            } else {
                await api.createPartnerProduct(payload);
            }
            setModalVisible(false);
            await fetchData();
        } catch (e) {
            Alert.alert('Error', 'Failed to save product');
        }
    };

    const handleDelete = (item) => {
        Alert.alert('Delete Product', `Delete "${item.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await api.deletePartnerProduct(item.id);
                        await fetchData();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete product');
                    }
                },
            },
        ]);
    };

    const formatCurrency = (v) => {
        if (v == null) return '-';
        return '₹' + Number(v).toLocaleString('en-IN');
    };

    const typeColor = {
        microloan: '#4FC3F7',
        insurance: '#CE93D8',
        savings_account: '#A5D6A7',
        scheme: colors.brightGold,
        fixed_deposit: '#FFB74D',
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
                    <Text style={styles.headerTitle}>My Products</Text>
                    <Text style={styles.headerSub}>Manage your financial products</Text>
                </View>
                <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
                    <Plus size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brightGold} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 80 }} />
                ) : products.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Package size={48} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>No products yet</Text>
                        <Text style={styles.emptySubtitle}>Tap + to add your first product</Text>
                    </View>
                ) : (
                    products.map(item => (
                        <View key={item.id} style={styles.productCard}>
                            <View style={styles.cardTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.productName}>{item.name}</Text>
                                    <View style={styles.typeRow}>
                                        <View style={[styles.typeBadge, { backgroundColor: `${typeColor[item.type] || colors.brightGold}20` }]}>
                                            <Text style={[styles.typeText, { color: typeColor[item.type] || colors.brightGold }]}>
                                                {(item.type || '').replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                                        <Edit3 size={16} color={colors.brightGold} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                                        <Trash2 size={16} color="#ff4b4b" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {item.description ? (
                                <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
                            ) : null}

                            <View style={styles.metaRow}>
                                {item.interestRate != null && (
                                    <View style={styles.metaChip}>
                                        <Percent size={12} color={colors.textMuted} />
                                        <Text style={styles.metaChipText}>{item.interestRate}% interest</Text>
                                    </View>
                                )}
                                {item.minAmount != null && (
                                    <View style={styles.metaChip}>
                                        <DollarSign size={12} color={colors.textMuted} />
                                        <Text style={styles.metaChipText}>
                                            {formatCurrency(item.minAmount)} – {formatCurrency(item.maxAmount)}
                                        </Text>
                                    </View>
                                )}
                                {(item.matchedCount != null || item._count?.matches != null) && (
                                    <View style={styles.metaChip}>
                                        <Users size={12} color={colors.textMuted} />
                                        <Text style={styles.metaChipText}>
                                            {item.matchedCount ?? item._count?.matches ?? 0} matches
                                        </Text>
                                    </View>
                                )}
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
                                {editItem ? 'Edit Product' : 'New Product'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.fieldLabel}>Product Name</Text>
                            <TextInput
                                style={styles.input}
                                value={form.name}
                                onChangeText={v => setForm({ ...form, name: v })}
                                placeholder="e.g. Micro Business Loan"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.fieldLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={form.description}
                                onChangeText={v => setForm({ ...form, description: v })}
                                placeholder="Describe your product..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />

                            <Text style={styles.fieldLabel}>Type</Text>
                            <View style={styles.typeSelector}>
                                {PRODUCT_TYPES.map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.typeOption, form.type === t && styles.typeOptionActive]}
                                        onPress={() => setForm({ ...form, type: t })}
                                    >
                                        <Text style={[styles.typeOptionText, form.type === t && styles.typeOptionTextActive]}>
                                            {t.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Interest Rate (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={form.interestRate}
                                onChangeText={v => setForm({ ...form, interestRate: v })}
                                placeholder="e.g. 8.5"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                            />

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Min Amount (₹)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.minAmount}
                                        onChangeText={v => setForm({ ...form, minAmount: v })}
                                        placeholder="e.g. 5000"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Max Amount (₹)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.maxAmount}
                                        onChangeText={v => setForm({ ...form, maxAmount: v })}
                                        placeholder="e.g. 500000"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>{editItem ? 'Update' : 'Create'} Product</Text>
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
    addBtn: { padding: 8, backgroundColor: colors.brightGold, borderRadius: 12 },
    scrollContent: { padding: 20 },
    emptyCard: { ...glassmorphism.card, padding: 52, alignItems: 'center', gap: 12 },
    emptyTitle: { fontWeight: '600', color: colors.textPrimary, fontSize: 17 },
    emptySubtitle: { color: colors.textMuted, fontSize: 13 },
    productCard: { ...glassmorphism.card, padding: 16, marginBottom: 12 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    productName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    typeRow: { flexDirection: 'row', marginTop: 4 },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    typeText: { fontSize: 10, fontWeight: '600' },
    iconBtn: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 8 },
    deleteBtn: { backgroundColor: 'rgba(255,75,75,0.1)' },
    productDesc: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: 12 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    },
    metaChipText: { fontSize: 11, color: colors.textMuted },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#140F0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
        maxHeight: '85%', paddingBottom: 32,
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
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeOption: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    typeOptionActive: { backgroundColor: colors.brightGold },
    typeOptionText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
    typeOptionTextActive: { color: '#000' },
    saveBtn: {
        backgroundColor: colors.brightGold, marginHorizontal: 20,
        marginTop: 20, padding: 14, borderRadius: 10, alignItems: 'center',
    },
    saveBtnText: { fontWeight: '600', color: '#000', fontSize: 15 },
});
