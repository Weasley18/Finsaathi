import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Phone, Shield, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { colors, glassmorphism } from '../theme';

export default function AdvisorClientDetail({ route, navigation }) {
    const { client } = route.params;

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
                    <TouchableOpacity style={styles.actionBtn}>
                        <Phone size={20} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <TrendingUp size={20} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Goals</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#e74c3c' }]}>
                        <AlertTriangle size={20} color="#e74c3c" />
                        <Text style={[styles.actionText, { color: '#e74c3c' }]}>Alert</Text>
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
                    <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                        No notes added yet. Tap to add.
                    </Text>
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
