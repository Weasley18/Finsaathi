import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, Switch, Animated, Easing, TextInput,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    MessageSquareText, Smartphone, FileText, Mic,
    ArrowLeft, ChevronRight, Shield, CheckCircle2,
    Upload, Zap, IndianRupee, Trash2, AlertTriangle,
    CheckCircle, X, Clock, Eye,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import BottomNav from '../components/BottomNav';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const { width } = Dimensions.get('window');
const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const DOC_TYPE_OPTIONS = [
    { value: 'salary_slip', label: 'Salary Slip', emoji: '💰' },
    { value: 'bank_statement', label: 'Bank Statement', emoji: '🏦' },
    { value: 'tax_document', label: 'Tax Document', emoji: '📋' },
    { value: 'investment', label: 'Investment Proof', emoji: '📈' },
    { value: 'other', label: 'Other', emoji: '📄' },
];

const STATUS_CONFIG = {
    PENDING: { label: 'Pending', color: '#FF9800', icon: Clock },
    VERIFIED: { label: 'Verified', color: '#4caf50', icon: CheckCircle },
    REJECTED: { label: 'Rejected', color: '#F44336', icon: AlertTriangle },
    ANALYZED: { label: 'Analyzed', color: '#4caf50', icon: CheckCircle },
};

export default function LinkFinance({ navigation }) {
    // ── SMS State ──
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [smsText, setSmsText] = useState('');
    const [smsParsing, setSmsParsing] = useState(false);
    const [smsParsed, setSmsParsed] = useState(null);
    const [smsImporting, setSmsImporting] = useState(false);
    const [smsImported, setSmsImported] = useState(false);

    // ── UPI State ──
    const [upiEnabled, setUpiEnabled] = useState(false);

    // ── Document Vault State ──
    const [documents, setDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('bank_statement');
    const [docExpanded, setDocExpanded] = useState(false);

    // ── Refresh ──
    const [refreshing, setRefreshing] = useState(false);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

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

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    // ── Fetch documents on mount ──
    const fetchDocuments = useCallback(async () => {
        setDocsLoading(true);
        try {
            const { data } = await api.get('/documents');
            setDocuments(data.documents || []);
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        } finally {
            setDocsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDocuments();
        setRefreshing(false);
    }, [fetchDocuments]);

    // ── SMS Parse Handler ──
    const handleParseSms = async () => {
        if (!smsText.trim()) return;
        setSmsParsing(true);
        setSmsParsed(null);
        setSmsImported(false);
        try {
            const { data } = await api.parseSms(smsText.trim());
            setSmsParsed(data);
        } catch (err) {
            setSmsParsed({ error: 'Failed to parse SMS. Please check format.' });
        } finally {
            setSmsParsing(false);
        }
    };

    // ── SMS Import Handler ──
    const handleImportSms = async () => {
        if (!smsText.trim()) return;
        setSmsImporting(true);
        try {
            const { data } = await api.importSms([smsText.trim()]);
            setSmsImported(true);
            Alert.alert('Success', `Imported ${data.imported || 1} transaction(s) successfully!`);
        } catch (err) {
            Alert.alert('Error', 'Failed to import transaction.');
        } finally {
            setSmsImporting(false);
        }
    };

    // ── Document Upload Handler ──
    const handleDocumentUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets?.[0];
            if (!file) return;

            setUploading(true);
            const response = await api.uploadDocument(file, selectedDocType);
            Alert.alert(
                'Upload Successful',
                `${file.name} has been uploaded and ${response.chunksIndexed > 0 ? 'indexed for AI analysis' : 'is being processed'}.`,
            );
            fetchDocuments();
        } catch (err) {
            console.error('Upload error:', err);
            Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // ── Document Delete Handler ──
    const handleDeleteDocument = (docId, docName) => {
        Alert.alert(
            'Delete Document',
            `Are you sure you want to delete "${docName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/documents/${docId}`);
                            setDocuments(prev => prev.filter(d => d.id !== docId));
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete document.');
                        }
                    },
                },
            ],
        );
    };

    const renderDocStatus = (status) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        return (
            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
                <Icon size={11} color={cfg.color} />
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Link Your Finances</Text>
                        <Text style={styles.headerSub}>
                            Connect your financial activity to FinSaathi
                        </Text>
                    </View>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                            tintColor={colors.accent} colors={[colors.accent]} />
                    }
                >
                    {/* Privacy notice */}
                    <View style={styles.privacyBanner}>
                        <Shield size={16} color={colors.successLight} />
                        <Text style={styles.privacyText}>
                            All data is encrypted on-device. Nothing is shared without your consent.
                        </Text>
                    </View>

                    {/* ── 1. SMS Parsing ── */}
                    <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, styles.featureCard]}>
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
                                    AI reads bank SMS to auto-detect transactions
                                </Text>
                            </View>
                            <Switch
                                value={smsEnabled}
                                onValueChange={(val) => {
                                    setSmsEnabled(val);
                                    if (!val) { setSmsParsed(null); setSmsText(''); setSmsImported(false); }
                                }}
                                trackColor={{ false: colors.surfaceLight, true: colors.accentDark }}
                                thumbColor={smsEnabled ? colors.accentLight : colors.textMuted}
                            />
                        </View>

                        {smsEnabled && (
                            <View style={styles.featureExpanded}>
                                <Text style={styles.inputLabel}>Paste a bank SMS</Text>
                                <TextInput
                                    value={smsText}
                                    onChangeText={(t) => { setSmsText(t); setSmsParsed(null); setSmsImported(false); }}
                                    multiline
                                    numberOfLines={3}
                                    placeholder="e.g. Rs.500 debited from a/c XX1234 for UPI txn to Swiggy..."
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.textInput}
                                />

                                <View style={styles.smsActions}>
                                    <TouchableOpacity
                                        onPress={handleParseSms}
                                        disabled={smsParsing || !smsText.trim()}
                                        style={[styles.actionBtn, !smsText.trim() && { opacity: 0.4 }]}
                                    >
                                        {smsParsing ? (
                                            <ActivityIndicator size="small" color="#000" />
                                        ) : (
                                            <>
                                                <Eye size={14} color="#000" />
                                                <Text style={styles.actionBtnText}>Parse</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    {smsText.trim() ? (
                                        <TouchableOpacity
                                            onPress={() => { setSmsText(''); setSmsParsed(null); setSmsImported(false); }}
                                            style={styles.clearBtn}
                                        >
                                            <Trash2 size={14} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    ) : null}

                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('SMSImport')}
                                        style={styles.batchBtn}
                                    >
                                        <Upload size={13} color={colors.accent} />
                                        <Text style={styles.batchBtnText}>Batch Import</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Parsed result */}
                                {smsParsed && (
                                    <View style={styles.parsedResult}>
                                        {smsParsed.error ? (
                                            <View style={styles.errorRow}>
                                                <AlertTriangle size={16} color="#F44336" />
                                                <Text style={styles.errorText}>{smsParsed.error}</Text>
                                            </View>
                                        ) : smsParsed.transaction ? (
                                            <>
                                                <View style={styles.successRow}>
                                                    <CheckCircle size={16} color={colors.successLight} />
                                                    <Text style={styles.successText}>Parsed Successfully</Text>
                                                </View>
                                                <View style={styles.resultGrid}>
                                                    <View style={styles.resultItem}>
                                                        <Text style={styles.resultLabel}>Type</Text>
                                                        <Text style={[styles.resultValue, {
                                                            color: smsParsed.transaction.type === 'DEBIT' ? '#F44336' : colors.successLight,
                                                        }]}>
                                                            {smsParsed.transaction.type}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.resultItem}>
                                                        <Text style={styles.resultLabel}>Amount</Text>
                                                        <Text style={[styles.resultValue, { fontSize: 18 }]}>
                                                            {fmt(smsParsed.transaction.amount)}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.resultItem}>
                                                        <Text style={styles.resultLabel}>Category</Text>
                                                        <Text style={styles.resultValue}>
                                                            {smsParsed.transaction.category || '—'}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.resultItem}>
                                                        <Text style={styles.resultLabel}>Merchant</Text>
                                                        <Text style={styles.resultValue}>
                                                            {smsParsed.transaction.merchant || '—'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {!smsImported && (
                                                    <TouchableOpacity
                                                        onPress={handleImportSms}
                                                        disabled={smsImporting}
                                                        style={[styles.importBtn, { marginTop: 14 }]}
                                                    >
                                                        {smsImporting ? (
                                                            <ActivityIndicator size="small" color="#000" />
                                                        ) : (
                                                            <>
                                                                <Upload size={14} color="#000" />
                                                                <Text style={styles.actionBtnText}>Save Transaction</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                )}
                                                {smsImported && (
                                                    <View style={[styles.successRow, { marginTop: 12 }]}>
                                                        <CheckCircle2 size={16} color={colors.successLight} />
                                                        <Text style={styles.successText}>Transaction saved!</Text>
                                                    </View>
                                                )}
                                            </>
                                        ) : (
                                            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                                                Could not parse this SMS format.
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </LinearGradient>

                    {/* ── 2. UPI Deep-Link Integration ── */}
                    <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, styles.featureCard]}>
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
                                trackColor={{ false: colors.surfaceLight, true: colors.accentDark }}
                                thumbColor={upiEnabled ? colors.accentLight : colors.textMuted}
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
                                            <Zap size={12} color={colors.successLight} />
                                            <Text style={styles.upiAppText}>{app}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.upiNote}>
                                    <Zap size={12} color={colors.accent} />
                                    <Text style={styles.upiNoteText}>
                                        Auto-captures amount, merchant & category from UPI notifications
                                    </Text>
                                </View>
                            </View>
                        )}
                    </LinearGradient>

                    {/* ── 3. Document Vault ── */}
                    <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, styles.featureCard]}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setDocExpanded(!docExpanded)}
                        >
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
                                <View style={styles.docCountBadge}>
                                    <Text style={styles.docCountText}>{documents.length}</Text>
                                </View>
                                <Animated.View style={{ transform: [{ rotate: docExpanded ? '90deg' : '0deg' }] }}>
                                    <ChevronRight size={20} color={colors.textMuted} />
                                </Animated.View>
                            </View>
                        </TouchableOpacity>

                        {docExpanded && (
                            <View style={styles.featureExpanded}>
                                {/* Document type selector */}
                                <Text style={styles.inputLabel}>Document Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                    style={{ marginBottom: 14 }}>
                                    <View style={styles.docTypeRow}>
                                        {DOC_TYPE_OPTIONS.map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => setSelectedDocType(opt.value)}
                                                style={[
                                                    styles.docTypeChip,
                                                    selectedDocType === opt.value && styles.docTypeChipActive,
                                                ]}
                                            >
                                                <Text style={styles.docTypeEmoji}>{opt.emoji}</Text>
                                                <Text style={[
                                                    styles.docTypeLabel,
                                                    selectedDocType === opt.value && styles.docTypeLabelActive,
                                                ]}>{opt.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>

                                {/* Upload area */}
                                <TouchableOpacity
                                    style={styles.uploadArea}
                                    activeOpacity={0.7}
                                    onPress={handleDocumentUpload}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <ActivityIndicator size="large" color={colors.accent} />
                                            <Text style={styles.uploadText}>Uploading & analyzing...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={28} color={colors.accent} />
                                            <Text style={styles.uploadText}>Tap to upload document</Text>
                                            <Text style={styles.uploadHint}>
                                                PDF, JPG, PNG — salary slips, bank statements, tax docs
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.ragInfo}>
                                    <Zap size={14} color={colors.accent} />
                                    <Text style={styles.ragText}>
                                        AI reads your documents using RAG pipeline to answer questions about your financial health
                                    </Text>
                                </View>

                                {/* Document list */}
                                {docsLoading ? (
                                    <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 10 }} />
                                ) : documents.length > 0 ? (
                                    <View style={styles.docList}>
                                        <Text style={styles.sectionLabel}>
                                            YOUR DOCUMENTS ({documents.length})
                                        </Text>
                                        {documents.map((doc) => (
                                            <View key={doc.id} style={styles.docItem}>
                                                <FileText size={18} color={colors.textSecondary} />
                                                <View style={styles.docInfo}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.docName} numberOfLines={1}>
                                                            {doc.fileName}
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                            <Text style={styles.docType}>
                                                                {(doc.type || 'other').replace(/_/g, ' ')}
                                                            </Text>
                                                            {renderDocStatus(doc.status)}
                                                        </View>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteDocument(doc.id, doc.fileName)}
                                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                    >
                                                        <Trash2 size={16} color={colors.textMuted} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyDocs}>
                                        <FileText size={32} color={colors.textMuted} />
                                        <Text style={styles.emptyDocsText}>No documents yet</Text>
                                        <Text style={styles.emptyDocsHint}>
                                            Upload your first document to get AI-powered insights
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </LinearGradient>

                    {/* ── 4. Manual AI Assist ── */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('AIChat')}
                    >
                        <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, styles.featureCard]}>
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
                                <ChevronRight size={20} color={colors.textMuted} />
                            </View>

                            <View style={styles.featureExpanded}>
                                <View style={styles.exampleBubbles}>
                                    {['"spent 200 on chai"', '"paid rent 15000"', '"received salary"'].map((text, i) => (
                                        <View key={i} style={styles.exampleBubble}>
                                            <Text style={styles.exampleText}>{text}</Text>
                                        </View>
                                    ))}
                                </View>
                                <Text style={styles.aiNote}>
                                    NLP model auto-categorizes and logs each transaction
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Bottom spacer for nav */}
                    <View style={{ height: 100 }} />
                </ScrollView>

                <BottomNav />
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    headerSub: {
        fontSize: 13,
        color: colors.textSecondary,
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
        color: colors.successLight,
        lineHeight: 18,
    },
    // Feature card
    featureCard: {
        padding: 20,
        marginBottom: 16,
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
        color: colors.textPrimary,
        marginBottom: 3,
    },
    featureDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    featureExpanded: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },

    // ── SMS Section ──
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        padding: 14,
        color: colors.textPrimary,
        fontSize: 13,
        textAlignVertical: 'top',
        minHeight: 80,
        borderWidth: 1,
        borderColor: colors.divider,
        lineHeight: 19,
    },
    smsActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.accent,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
    },
    actionBtnText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 13,
    },
    clearBtn: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    batchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginLeft: 'auto',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    batchBtnText: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '600',
    },
    importBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.successLight,
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 10,
    },
    parsedResult: {
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorText: {
        color: '#F44336',
        fontSize: 13,
        flex: 1,
    },
    successRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    successText: {
        color: colors.successLight,
        fontWeight: '600',
        fontSize: 13,
    },
    resultGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    resultItem: {
        width: '45%',
    },
    resultLabel: {
        fontSize: 11,
        color: colors.textMuted,
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },

    // ── UPI Section ──
    expandedNote: {
        color: colors.textSecondary,
        fontSize: 13,
        marginBottom: 12,
    },
    upiApps: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
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
        color: colors.successLight,
        fontSize: 13,
        fontWeight: '600',
    },
    upiNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(186, 143, 13, 0.06)',
    },
    upiNoteText: {
        flex: 1,
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },

    // ── Document Vault ──
    docCountBadge: {
        backgroundColor: colors.accent + '25',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 8,
    },
    docCountText: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '700',
    },
    docTypeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    docTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: colors.divider,
    },
    docTypeChipActive: {
        backgroundColor: colors.accent + '22',
        borderColor: colors.accent,
    },
    docTypeEmoji: {
        fontSize: 14,
    },
    docTypeLabel: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '500',
    },
    docTypeLabelActive: {
        color: colors.accent,
        fontWeight: '600',
    },
    uploadArea: {
        borderWidth: 1.5,
        borderColor: colors.cardBorder,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 14,
        backgroundColor: 'rgba(186, 143, 13, 0.04)',
    },
    uploadText: {
        color: colors.accent,
        fontSize: 15,
        fontWeight: '600',
        marginTop: 10,
    },
    uploadHint: {
        color: colors.textMuted,
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
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    sectionLabel: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    docList: {
        gap: 8,
    },
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.25)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    docInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    docName: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '500',
    },
    docType: {
        fontSize: 11,
        color: colors.textMuted,
        textTransform: 'capitalize',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyDocs: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyDocsText: {
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
        marginTop: 10,
    },
    emptyDocsHint: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },

    // ── Manual AI Assist ──
    exampleBubbles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    exampleBubble: {
        backgroundColor: colors.accent + '18',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: colors.accent + '35',
    },
    exampleText: {
        color: colors.accent,
        fontSize: 13,
        fontStyle: 'italic',
    },
    aiNote: {
        color: colors.textMuted,
        fontSize: 12,
        lineHeight: 17,
    },
});
