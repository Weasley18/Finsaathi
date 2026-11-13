import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Smartphone, CheckCircle, AlertTriangle, Upload, MessageSquare, Trash2 } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from '../components/BottomNav';
import api from '../services/api';
import { colors, gradients, glassmorphism } from '../theme';

const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function SMSImport({ navigation }) {
  const [mode, setMode] = useState('single'); // single | batch
  const [smsText, setSmsText] = useState('');
  const [batchText, setBatchText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleParseSingle = async () => {
    if (!smsText.trim()) return;
    setLoading(true);
    setParsed(null);
    try {
      const { data } = await api.parseSms(smsText.trim());
      setParsed(data);
    } catch { setParsed({ error: 'Failed to parse' }); }
    finally { setLoading(false); }
  };

  const handleParseBatch = async () => {
    const lines = batchText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    setLoading(true);
    setBatchResult(null);
    setImportResult(null);
    try {
      const { data } = await api.batchParseSms(lines);
      setBatchResult(data);
    } catch { setBatchResult({ error: 'Failed to parse batch' }); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    const lines = batchText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    setImporting(true);
    try {
      const { data } = await api.importSms(lines);
      setImportResult(data);
    } catch { setImportResult({ error: 'Import failed' }); }
    finally { setImporting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.backgroundRoyal} style={styles.background} />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>SMS Import</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Mode toggle */}
          <View style={styles.toggleRow}>
            {[{ key: 'single', icon: MessageSquare, label: 'Single' }, { key: 'batch', icon: Upload, label: 'Batch' }].map(m => (
              <TouchableOpacity key={m.key} onPress={() => { setMode(m.key); setParsed(null); setBatchResult(null); setImportResult(null); }}
                style={[styles.toggleBtn, mode === m.key && styles.toggleBtnActive]}>
                <m.icon size={14} color={mode === m.key ? '#000' : colors.textMuted} />
                <Text style={[styles.toggleLabel, mode === m.key && { color: '#000' }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── Single SMS ─── */}
          {mode === 'single' && (
            <>
              <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 20, marginBottom: 16 }]}>
                <Text style={styles.inputLabel}>Paste a bank SMS</Text>
                <TextInput
                  value={smsText}
                  onChangeText={setSmsText}
                  multiline
                  numberOfLines={4}
                  placeholder="e.g. Your a/c XX1234 debited by Rs.500.00..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity onPress={handleParseSingle} disabled={loading || !smsText.trim()}
                    style={[styles.actionBtn, !smsText.trim() && { opacity: 0.4 }]}>
                    {loading ? <ActivityIndicator size="small" color="#000" /> :
                      <><Smartphone size={14} color="#000" /><Text style={styles.actionBtnText}>Parse</Text></>}
                  </TouchableOpacity>
                  {smsText ? (
                    <TouchableOpacity onPress={() => { setSmsText(''); setParsed(null); }} style={styles.clearBtn}>
                      <Trash2 size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </LinearGradient>

              {parsed && (
                <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 20 }]}>
                  {parsed.error ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AlertTriangle size={16} color="#F44336" />
                      <Text style={{ color: '#F44336', marginLeft: 8 }}>{parsed.error}</Text>
                    </View>
                  ) : parsed.transaction ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <CheckCircle size={16} color="#4caf50" />
                        <Text style={{ color: '#4caf50', fontWeight: '600', marginLeft: 8 }}>Parsed Successfully</Text>
                      </View>
                      <View style={styles.resultGrid}>
                        <View style={styles.resultItem}>
                          <Text style={styles.resultLabel}>Type</Text>
                          <Text style={[styles.resultValue, { color: parsed.transaction.type === 'DEBIT' ? '#F44336' : '#4caf50' }]}>
                            {parsed.transaction.type}
                          </Text>
                        </View>
                        <View style={styles.resultItem}>
                          <Text style={styles.resultLabel}>Amount</Text>
                          <Text style={[styles.resultValue, { fontSize: 18 }]}>{fmt(parsed.transaction.amount)}</Text>
                        </View>
                        <View style={styles.resultItem}>
                          <Text style={styles.resultLabel}>Category</Text>
                          <Text style={styles.resultValue}>{parsed.transaction.category || '—'}</Text>
                        </View>
                        <View style={styles.resultItem}>
                          <Text style={styles.resultLabel}>Merchant</Text>
                          <Text style={styles.resultValue}>{parsed.transaction.merchant || '—'}</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={{ color: colors.textMuted }}>Could not parse this SMS format.</Text>
                  )}
                </LinearGradient>
              )}
            </>
          )}

          {/* ─── Batch ─── */}
          {mode === 'batch' && (
            <>
              <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 20, marginBottom: 16 }]}>
                <Text style={styles.inputLabel}>Paste multiple SMS (one per line)</Text>
                <TextInput
                  value={batchText}
                  onChangeText={setBatchText}
                  multiline
                  numberOfLines={8}
                  placeholder="One SMS per line..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInput, { height: 160 }]}
                />
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                  {batchText.split('\n').filter(s => s.trim()).length} messages
                </Text>
                <TouchableOpacity onPress={handleParseBatch} disabled={loading || !batchText.trim()}
                  style={[styles.actionBtn, { marginTop: 12 }, !batchText.trim() && { opacity: 0.4 }]}>
                  {loading ? <ActivityIndicator size="small" color="#000" /> :
                    <><Upload size={14} color="#000" /><Text style={styles.actionBtnText}>Parse All</Text></>}
                </TouchableOpacity>
              </LinearGradient>

              {batchResult && !batchResult.error && (
                <>
                  {/* Stats */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { flex: 1, padding: 14, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#4caf50' }}>{batchResult.parsed?.length || 0}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Parsed</Text>
                    </LinearGradient>
                    <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { flex: 1, padding: 14, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#F44336' }}>{batchResult.failed?.length || 0}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Failed</Text>
                    </LinearGradient>
                  </View>

                  {/* Parsed list */}
                  {batchResult.parsed?.map((tx, i) => (
                    <LinearGradient key={i} colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 12, marginBottom: 6 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tx.type === 'DEBIT' ? '#F44336' : '#4caf50', marginRight: 10 }} />
                        <Text style={{ flex: 1, color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                          {tx.merchant || tx.category || 'Unknown'}
                        </Text>
                        <Text style={{ fontWeight: '700', color: tx.type === 'DEBIT' ? '#F44336' : '#4caf50' }}>
                          {tx.type === 'DEBIT' ? '-' : '+'}{fmt(tx.amount)}
                        </Text>
                      </View>
                    </LinearGradient>
                  ))}

                  {/* Import button */}
                  <TouchableOpacity onPress={handleImport} disabled={importing}
                    style={[styles.actionBtn, { marginTop: 12, alignSelf: 'center', paddingHorizontal: 32 }]}>
                    {importing ? <ActivityIndicator size="small" color="#000" /> :
                      <><Upload size={14} color="#000" /><Text style={styles.actionBtnText}>Import All</Text></>}
                  </TouchableOpacity>
                </>
              )}

              {batchResult?.error && (
                <LinearGradient colors={gradients.surfaceCard} style={[glassmorphism.card, { padding: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AlertTriangle size={16} color="#F44336" />
                    <Text style={{ color: '#F44336', marginLeft: 8 }}>{batchResult.error}</Text>
                  </View>
                </LinearGradient>
              )}

              {importResult && !importResult.error && (
                <LinearGradient colors={gradients.surfaceCard}
                  style={[glassmorphism.card, { padding: 20, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#4caf50' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <CheckCircle size={18} color="#4caf50" />
                    <Text style={{ fontWeight: '700', fontSize: 16, color: colors.textPrimary, marginLeft: 8 }}>Import Complete!</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Imported</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{importResult.imported || 0}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Duplicates</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#FF9800' }}>{importResult.duplicates || 0}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Failed</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#F44336' }}>{importResult.failed || 0}</Text>
                    </View>
                  </View>
                </LinearGradient>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  content: { flex: 1 },
  scrollContent: { padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toggleBtnActive: { backgroundColor: colors.accent },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 6 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 },
  textInput: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 14,
    color: colors.textPrimary, fontSize: 13, textAlignVertical: 'top', height: 100,
    borderWidth: 1, borderColor: colors.divider,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  actionBtnText: { color: '#000', fontWeight: '600', fontSize: 14 },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: colors.divider,
  },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultItem: { width: '45%' },
  resultLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  resultValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
});
