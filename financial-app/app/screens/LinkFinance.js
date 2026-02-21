import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, Switch, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    MessageSquareText, Smartphone, FileText, Mic,
    ArrowLeft, ChevronRight, Shield, CheckCircle2,
    Upload, Zap, IndianRupee,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function LinkFinance({ navigation }) {
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [upiEnabled, setUpiEnabled] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#1a1a1a', '#0d0d0d']}
                style={styles.background}
            />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={22} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Link Your Finances</Text>
                        <Text style={styles.headerSub}>
                            Connect your financial activity to FinSaathi
                        </Text>
                    </View>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Privacy notice */}
                    <View style={styles.privacyBanner}>
                        <Shield size={16} color="#4caf50" />
                        <Text style={styles.privacyText}>
                            All data stays on-device. Nothing is shared without your consent.
                        </Text>
                    </View>

                    {/* ── 1. SMS Parsing ── */}
                    <View style={styles.featureCard}>
                        <View style={styles.featureHeader}>
                            <Animated.View
                                style={[
                                    styles.featureIconBox,
                                    { backgroundColor: '#1a237e', transform: [{ scale: pulseAnim }] },
                                ]}
                            >
                                <MessageSquareText size={24} color="#fff" />
                            </Animated.View>
                            <View style={styles.featureInfo}>
                                <Text style={styles.featureTitle}>SMS Parsing</Text>
                                <Text style={styles.featureDesc}>
                                    On-device AI reads bank SMS to auto-detect transactions
                                </Text>
                            </View>
                            <Switch
                                value={smsEnabled}
                                onValueChange={setSmsEnabled}
                                trackColor={{ false: '#333', true: '#ba8f0d' }}
                                thumbColor={smsEnabled ? '#ffd700' : '#888'}
                            />
                        </View>

                        {smsEnabled && (
                            <View style={styles.featureExpanded}>
                                <View style={styles.permissionRow}>
                                    <CheckCircle2 size={16} color="#4caf50" />
                                    <Text style={styles.permissionText}>
                                        SMS read permission granted
                                    </Text>
                                </View>
                                <View style={styles.detectedList}>
                                    <Text style={styles.detectedLabel}>Auto-detected today:</Text>
                                    <View style={styles.detectedItem}>
                                        <IndianRupee size={14} color="#ba8f0d" />
                                        <Text style={styles.detectedText}>
                                            ₹850 at Grocery Mart — <Text style={styles.categoryTag}>Food</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.detectedItem}>
                                        <IndianRupee size={14} color="#ba8f0d" />
                                        <Text style={styles.detectedText}>
                                            ₹1,200 Electricity Bill — <Text style={styles.categoryTag}>Bills</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.detectedItem}>
                                        <IndianRupee size={14} color="#ba8f0d" />
                                        <Text style={styles.detectedText}>
                                            ₹450 Swiggy — <Text style={styles.categoryTag}>Food</Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── 2. UPI Deep-Link Integration ── */}
                    <View style={styles.featureCard}>
                        <View style={styles.featureHeader}>
                            <View style={[styles.featureIconBox, { backgroundColor: '#4a148c' }]}>
                                <Smartphone size={24} color="#fff" />
                            </View>
                            <View style={styles.featureInfo}>
                                <Text style={styles.featureTitle}>UPI Auto-Log</Text>
                                <Text style={styles.featureDesc}>
                                    Detects GPay, PhonePe, Paytm payments automatically
                                </Text>
                            </View>
                            <Switch
                                value={upiEnabled}
                                onValueChange={setUpiEnabled}
                                trackColor={{ false: '#333', true: '#ba8f0d' }}
                                thumbColor={upiEnabled ? '#ffd700' : '#888'}
                            />
                        </View>

                        {upiEnabled && (
                            <View style={styles.featureExpanded}>
                                <Text style={styles.expandedNote}>
                                    Listening for UPI payment completions...
                                </Text>
                                <View style={styles.upiApps}>
                                    {['GPay', 'PhonePe', 'Paytm'].map((app) => (
                                        <View key={app} style={styles.upiAppChip}>
                                            <Zap size={12} color="#4caf50" />
                                            <Text style={styles.upiAppText}>{app}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── 3. Document Vault ── */}
                    <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
                        <View style={styles.featureHeader}>
                            <View style={[styles.featureIconBox, { backgroundColor: '#bf360c' }]}>
                                <FileText size={24} color="#fff" />
                            </View>
                            <View style={styles.featureInfo}>
                                <Text style={styles.featureTitle}>Document Vault</Text>
                                <Text style={styles.featureDesc}>
                                    Upload salary slips & bank statements for AI analysis
                                </Text>
                            </View>
                            <ChevronRight size={20} color="#666" />
                        </View>

                        <View style={styles.featureExpanded}>
                            <TouchableOpacity style={styles.uploadArea} activeOpacity={0.7}>
                                <Upload size={28} color="#ba8f0d" />
                                <Text style={styles.uploadText}>Tap to upload PDF</Text>
                                <Text style={styles.uploadHint}>
                                    Salary slips, bank statements, tax documents
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.ragInfo}>
                                <Zap size={14} color="#ba8f0d" />
                                <Text style={styles.ragText}>
                                    AI reads your documents using RAG pipeline to answer questions about your financial health
                                </Text>
                            </View>

                            <View style={styles.docList}>
                                <View style={styles.docItem}>
                                    <FileText size={16} color="#888" />
                                    <View style={styles.docInfo}>
                                        <Text style={styles.docName}>HDFC_Statement_Jan.pdf</Text>
                                        <Text style={styles.docStatus}>Analyzed ✓</Text>
                                    </View>
                                </View>
                                <View style={styles.docItem}>
                                    <FileText size={16} color="#888" />
                                    <View style={styles.docInfo}>
                                        <Text style={styles.docName}>Salary_Slip_Feb.pdf</Text>
                                        <Text style={styles.docStatus}>Analyzed ✓</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* ── 4. Manual AI Assist ── */}
                    <TouchableOpacity
                        style={styles.featureCard}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('AIChat')}
                    >
                        <View style={styles.featureHeader}>
                            <View style={[styles.featureIconBox, { backgroundColor: '#1b5e20' }]}>
                                <Mic size={24} color="#fff" />
                            </View>
                            <View style={styles.featureInfo}>
                                <Text style={styles.featureTitle}>Manual AI Assist</Text>
                                <Text style={styles.featureDesc}>
                                    Speak or type a transaction — AI categorizes it for you
                                </Text>
                            </View>
                            <ChevronRight size={20} color="#666" />
                        </View>

                        <View style={styles.featureExpanded}>
                            <View style={styles.exampleBubbles}>
                                <View style={styles.exampleBubble}>
                                    <Text style={styles.exampleText}>
                                        "spent 200 on chai"
                                    </Text>
                                </View>
                                <View style={styles.exampleBubble}>
                                    <Text style={styles.exampleText}>
                                        "paid rent 15000"
                                    </Text>
                                </View>
                                <View style={styles.exampleBubble}>
                                    <Text style={styles.exampleText}>
                                        "received salary"
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.aiNote}>
                                NLP model auto-categorizes and logs each transaction
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Bottom spacer */}
                    <View style={{ height: 30 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d0d0d',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e1e1e',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'serif',
    },
    headerSub: {
        fontSize: 13,
        color: '#777',
        marginTop: 2,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 0,
    },
    privacyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.08)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(76, 175, 80, 0.2)',
        gap: 10,
    },
    privacyText: {
        flex: 1,
        fontSize: 13,
        color: '#4caf50',
        lineHeight: 18,
    },
    // Feature card
    featureCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    featureHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    featureInfo: {
        flex: 1,
        marginRight: 8,
    },
    featureTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 3,
    },
    featureDesc: {
        fontSize: 13,
        color: '#888',
        lineHeight: 17,
    },
    featureExpanded: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    // SMS
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    permissionText: {
        color: '#4caf50',
        fontSize: 13,
        fontWeight: '500',
    },
    detectedList: {
        gap: 8,
    },
    detectedLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    detectedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#222',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    detectedText: {
        flex: 1,
        color: '#ccc',
        fontSize: 13,
    },
    categoryTag: {
        color: '#ba8f0d',
        fontWeight: '600',
    },
    // UPI
    expandedNote: {
        color: '#aaa',
        fontSize: 13,
        marginBottom: 12,
    },
    upiApps: {
        flexDirection: 'row',
        gap: 10,
    },
    upiAppChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(76, 175, 80, 0.2)',
    },
    upiAppText: {
        color: '#4caf50',
        fontSize: 13,
        fontWeight: '600',
    },
    // Document Vault
    uploadArea: {
        borderWidth: 1.5,
        borderColor: 'rgba(186, 143, 13, 0.3)',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 14,
        backgroundColor: 'rgba(186, 143, 13, 0.04)',
    },
    uploadText: {
        color: '#ba8f0d',
        fontSize: 15,
        fontWeight: '600',
        marginTop: 10,
    },
    uploadHint: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
    ragInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 14,
        backgroundColor: 'rgba(186, 143, 13, 0.06)',
        padding: 12,
        borderRadius: 10,
    },
    ragText: {
        flex: 1,
        color: '#aaa',
        fontSize: 12,
        lineHeight: 17,
    },
    docList: {
        gap: 8,
    },
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#222',
        padding: 12,
        borderRadius: 10,
    },
    docInfo: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    docName: {
        color: '#ccc',
        fontSize: 13,
    },
    docStatus: {
        color: '#4caf50',
        fontSize: 12,
        fontWeight: '600',
    },
    // Manual AI
    exampleBubbles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    exampleBubble: {
        backgroundColor: 'rgba(186, 143, 13, 0.1)',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(186, 143, 13, 0.2)',
    },
    exampleText: {
        color: '#ba8f0d',
        fontSize: 13,
        fontStyle: 'italic',
    },
    aiNote: {
        color: '#777',
        fontSize: 12,
        lineHeight: 17,
    },
});
