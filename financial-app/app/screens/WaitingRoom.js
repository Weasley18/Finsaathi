import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { LogOut, Clock, Headphones } from 'lucide-react-native';
import useAuthStore from '../store/authStore';

export default function WaitingRoom({ navigation }) {
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        navigation.replace('LanguageSelection');
    };

    const formattedDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Just now';

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0A0500', '#1a1005']} style={styles.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <LogOut size={16} color="#d4af35" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.glassCard}>
                    <View style={styles.iconContainer}>
                        <Clock size={32} color="#d4af35" />
                    </View>

                    <Text style={styles.title}>Reviewing Your Application</Text>
                    <Text style={styles.subtitle}>
                        This usually takes 24-48 hours. We appreciate your patience while we verify your details.
                    </Text>

                    <View style={styles.infoBox}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Name</Text>
                            <Text style={styles.infoValue}>{user?.name || 'Not provided'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Phone</Text>
                            <Text style={styles.infoValue}>{user?.phone}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Type</Text>
                            <Text style={styles.infoValue}>{user?.role?.replace('_', ' ')}</Text>
                        </View>
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.infoLabel}>Applied On</Text>
                            <Text style={styles.infoValue}>{formattedDate}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.supportBtn}>
                        <Headphones size={18} color="#d4af35" />
                        <Text style={styles.supportBtnText}>Contact Support</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>Refresh Status</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0500',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'flex-end',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
        gap: 6,
    },
    logoutText: {
        color: '#d4af35',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#d4af35',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    infoBox: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    infoLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    infoValue: {
        fontSize: 14,
        color: 'white',
        fontWeight: '500',
    },
    supportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d4af35',
        gap: 8,
        marginBottom: 16,
    },
    supportBtnText: {
        color: '#d4af35',
        fontSize: 16,
        fontWeight: '600',
    },
    refreshBtn: {
        paddingVertical: 8,
    },
    refreshText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },
});
