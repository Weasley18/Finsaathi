import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Phone, Shield, TrendingUp, AlertTriangle, MessageSquare, Send, Save } from 'lucide-react-native';
import { colors, glassmorphism } from '../theme';
import api from '../services/api';

export default function AdvisorClientDetail({ route, navigation }) {
    const { client } = route.params;
    const [notes, setNotes] = useState('');
    const [notesList, setNotesList] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.getAdvisorNotes(client.id).then(res => setNotesList(res.data?.notes || [])).catch(() => {});
    }, [client.id]);

    const saveNote = async () => {
        if (!notes.trim()) return;
        setSaving(true);
        try {
            await api.createAdvisorNote(client.id, notes.trim());
            setNotes('');
            const res = await api.getAdvisorNotes(client.id);
            setNotesList(res.data?.notes || []);
        } catch (err) { Alert.alert('Error', 'Failed to save note'); }
        finally { setSaving(false); }
    };

    // Mock detailed data
    const healthBreakdown = [
        { label: 'Savings', value: 45, color: '#f1c40f' },
        { label: 'Spending', value: 72, color: '#2ecc71' },
        { label: 'Goals', value: 55, color: '#3498db' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0A0500', '#1A0D00']} style={styles.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Client Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarTextLarge}>{client.name[0]}</Text>
                    </View>
                    <Text style={styles.nameLarge}>{client.name}</Text>
                    <Text style={styles.phoneLarge}>{client.phone}</Text>
                    <View style={styles.scoreContainer}>
                        <Text style={styles.scoreLabel}>Health Score</Text>
                        <Text style={[styles.scoreValue, { color: (client.healthScore || 0) < 40 ? '#e74c3c' : '#4caf50' }]}>
                            {client.healthScore || 0}/100
                        </Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DirectMessages', { userId: client.id, userName: client.name })}>
                        <MessageSquare size={20} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        api.scheduleCall(client.id, new Date(Date.now() + 86400000).toISOString(), 30)
                            .then(() => Alert.alert('Scheduled', 'Call scheduled for tomorrow'))
                            .catch(() => Alert.alert('Error', 'Failed to schedule'));
                    }}>
                        <Phone size={20} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        api.sendRecommendation(client.id, 'Start SIP', 'Consider starting a monthly SIP in an index fund to build long-term wealth.', 'investment')
                            .then(() => Alert.alert('Sent', 'Recommendation sent'))
                            .catch(() => Alert.alert('Error', 'Failed to send'));
                    }}>
                        <TrendingUp size={20} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Advise</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#e74c3c' }]} onPress={() => {
                        api.flagClient(client.id, 'Needs financial review', 'medium')
                            .then(() => Alert.alert('Flagged', 'Client flagged for review'))
                            .catch(() => Alert.alert('Error', 'Failed to flag'));
                    }}>
                        <AlertTriangle size={20} color="#e74c3c" />
                        <Text style={[styles.actionText, { color: '#e74c3c' }]}>Flag</Text>
                    </TouchableOpacity>
                </View>

                {/* Health Breakdown */}
                <Text style={styles.sectionTitle}>Financial Health</Text>
                <View style={styles.healthCard}>
                    {healthBreakdown.map((item, index) => (
                        <View key={index} style={styles.healthRow}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={styles.healthLabel}>{item.label}</Text>
                                <Text style={styles.healthValue}>{item.value}%</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${item.value}%`, backgroundColor: item.color }]} />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Advisor Notes - Simplified */}
                <Text style={styles.sectionTitle}>Notes</Text>
                <View style={styles.healthCard}>
                    <TextInput
                        style={{ color: colors.textPrimary, fontSize: 14, minHeight: 60, textAlignVertical: 'top' }}
                        placeholder="Add a note about this client..."
                        placeholderTextColor={colors.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 12 }}
                        onPress={saveNote}
                        disabled={saving || !notes.trim()}
                    >
                        <Save size={16} color="#000" />
                        <Text style={{ color: '#000', fontWeight: '600' }}>{saving ? 'Saving...' : 'Save Note'}</Text>
                    </TouchableOpacity>
                    {notesList.length > 0 && (
                        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
                            {notesList.slice(0, 5).map((n, i) => (
                                <View key={i} style={{ marginBottom: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.accent }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>{n.note || n.content}</Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>
                                        {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0500' },
    background: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },

    profileCard: { alignItems: 'center', marginBottom: 30 },
    avatarLarge: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(186, 143, 13, 0.2)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
        borderWidth: 2, borderColor: colors.accent
    },
    avatarTextLarge: { fontSize: 32, fontWeight: '700', color: colors.accent },
    nameLarge: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    phoneLarge: { fontSize: 16, color: colors.textSecondary, marginBottom: 16 },
    scoreContainer: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 },
    scoreLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    scoreValue: { fontSize: 28, fontWeight: '700' },

    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 30 },
    actionBtn: {
        width: 80, height: 80, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    actionText: { marginTop: 8, fontSize: 12, color: colors.textPrimary },

    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
    healthCard: {
        ...glassmorphism.card, padding: 20, marginBottom: 20
    },
    healthRow: { marginBottom: 20 },
    healthLabel: { color: colors.textSecondary, fontSize: 14 },
    healthValue: { color: colors.textPrimary, fontWeight: '600' },
    progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
    progressBarFill: { height: '100%', borderRadius: 3 },
});
