import React, { useState } from 'react';
import { api } from '../api';
import {
    MessageSquare, Upload, CheckCircle, AlertTriangle, ArrowRight,
    Trash2, IndianRupee, Clock, FileText, Smartphone, RefreshCw
} from 'lucide-react';

const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function TransactionImportPage() {
    const [tab, setTab] = useState('single'); // single | batch
    const [smsText, setSmsText] = useState('');
    const [batchText, setBatchText] = useState('');
    const [parsed, setParsed] = useState(null);
    const [batchResult, setBatchResult] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    // ─── Single SMS Parse ───
    const handleParseSingle = async () => {
        if (!smsText.trim()) return;
        setLoading(true);
        setParsed(null);
        try {
            const data = await api.parseSms(smsText.trim());
            setParsed(data);
        } catch { setParsed({ error: 'Failed to parse SMS' }); }
        finally { setLoading(false); }
    };

    // ─── Batch Parse ───
    const handleParseBatch = async () => {
        const lines = batchText.split('\n').map(s => s.trim()).filter(Boolean);
        if (!lines.length) return;
        setLoading(true);
        setBatchResult(null);
        setImportResult(null);
        try {
            const data = await api.batchParseSms(lines);
            setBatchResult(data);
        } catch { setBatchResult({ error: 'Failed to parse batch' }); }
        finally { setLoading(false); }
    };

    // ─── Import parsed transactions ───
    const handleImport = async () => {
        if (!batchResult?.parsed?.length) return;
        setImporting(true);
        try {
            // Re-send the original SMS texts for server-side import
            const lines = batchText.split('\n').map(s => s.trim()).filter(Boolean);
            const data = await api.importSms(lines);
            setImportResult(data);
        } catch { setImportResult({ error: 'Import failed' }); }
        finally { setImporting(false); }
    };

    return (
        <div>
            <header className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Smartphone size={22} color="var(--accent)" /> SMS Transaction Import
                </h2>
                <p>Paste bank SMS messages to auto-extract and import transactions</p>
            </header>

            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--card-bg)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
                {[
                    { key: 'single', icon: MessageSquare, label: 'Single SMS' },
                    { key: 'batch', icon: FileText, label: 'Batch Import' },
                ].map(t => (
                    <button key={t.key} onClick={() => { setTab(t.key); setParsed(null); setBatchResult(null); setImportResult(null); }} style={{
                        padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: tab === t.key ? 'var(--accent)' : 'transparent',
                        color: tab === t.key ? '#000' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <t.icon size={15} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ─── Single SMS ─── */}
            {tab === 'single' && (
                <div>
                    <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                        <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                            Paste a bank SMS message
                        </label>
                        <textarea
                            value={smsText}
                            onChange={e => setSmsText(e.target.value)}
                            placeholder="e.g. Your a/c XX1234 debited by Rs.500.00 on 15-01-25. UPI Ref 412345678901. Avl Bal Rs.12,500.00"
                            rows={4}
                            style={{
                                width: '100%', padding: 14, borderRadius: 10, border: '1px solid var(--card-border)',
                                background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical',
                                fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6,
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button onClick={handleParseSingle} disabled={loading || !smsText.trim()} style={{
                                padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: smsText.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: smsText.trim() ? '#000' : 'var(--text-muted)',
                                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                {loading ? <RefreshCw size={14} className="spin" /> : <ArrowRight size={14} />} Parse SMS
                            </button>
                            {smsText && (
                                <button onClick={() => { setSmsText(''); setParsed(null); }} style={{
                                    padding: '10px 16px', borderRadius: 8, border: '1px solid var(--card-border)',
                                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                                }}>
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Parse result */}
                    {parsed && (
                        <div className="glass-card" style={{ padding: 20 }}>
                            {parsed.error ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F44336' }}>
                                    <AlertTriangle size={18} /> {parsed.error}
                                </div>
                            ) : parsed.transaction ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#4CAF50' }}>
                                        <CheckCircle size={18} /> <span style={{ fontWeight: 600 }}>Transaction Parsed Successfully</span>
                                        {parsed.method && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(33,150,243,0.1)', color: '#2196F3' }}>{parsed.method}</span>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Type</span>
                                            <div style={{ fontWeight: 600, color: parsed.transaction.type === 'EXPENSE' ? '#F44336' : '#4CAF50' }}>
                                                {parsed.transaction.type}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Amount</span>
                                            <div style={{ fontWeight: 700, fontSize: 18 }}>{fmt(parsed.transaction.amount)}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Category</span>
                                            <div style={{ fontWeight: 600 }}>{parsed.transaction.category || 'Uncategorized'}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Merchant</span>
                                            <div style={{ fontWeight: 600 }}>{parsed.transaction.merchant || '—'}</div>
                                        </div>
                                        {parsed.transaction.date && (
                                            <div>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Date</span>
                                                <div style={{ fontWeight: 600 }}>{new Date(parsed.transaction.date).toLocaleDateString('en-IN')}</div>
                                            </div>
                                        )}
                                        {parsed.transaction.balance != null && (
                                            <div>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Balance</span>
                                                <div style={{ fontWeight: 600 }}>{fmt(parsed.transaction.balance)}</div>
                                            </div>
                                        )}
                                        {parsed.transaction.account && (
                                            <div>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Account</span>
                                                <div style={{ fontWeight: 600 }}>{parsed.transaction.account}</div>
                                            </div>
                                        )}
                                        {parsed.transaction.reference && (
                                            <div>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Reference</span>
                                                <div style={{ fontWeight: 600, fontSize: 12 }}>{parsed.transaction.reference}</div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div style={{ color: 'var(--text-muted)' }}>Could not parse the SMS. Try a different bank message format.</div>
                            )}
                        </div>
                    )}

                    {/* Example SMS */}
                    <div className="glass-card" style={{ padding: 16, marginTop: 16 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--text-muted)' }}>Example SMS formats:</div>
                        {[
                            'Your a/c XX1234 debited by Rs.2,500.00 on 15-01-25 for UPI-Swiggy. Bal Rs.45,000.00',
                            'Rs.15000 credited to a/c XX5678 on 01-02-25. NEFT from SALARY. Bal Rs.60000',
                            'INR 899.00 spent on HDFC Card XX9012 at Amazon.in on 20-01-25. Avl Limit: 1,50,000',
                        ].map((ex, i) => (
                            <div key={i} onClick={() => setSmsText(ex)} style={{
                                padding: '8px 12px', marginBottom: 6, borderRadius: 8, fontSize: 12,
                                background: 'var(--bg-secondary)', cursor: 'pointer', lineHeight: 1.5,
                                color: 'var(--text-secondary)',
                            }}>
                                {ex}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Batch Import ─── */}
            {tab === 'batch' && (
                <div>
                    <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                        <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                            Paste multiple SMS messages (one per line)
                        </label>
                        <textarea
                            value={batchText}
                            onChange={e => setBatchText(e.target.value)}
                            placeholder="Paste one SMS per line...&#10;Your a/c XX1234 debited by Rs.500 on 15-01-25&#10;Rs.15000 credited to a/c XX5678 on 01-02-25"
                            rows={8}
                            style={{
                                width: '100%', padding: 14, borderRadius: 10, border: '1px solid var(--card-border)',
                                background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical',
                                fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6,
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {batchText.split('\n').filter(s => s.trim()).length} messages
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={handleParseBatch} disabled={loading || !batchText.trim()} style={{
                                    padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: batchText.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                                    color: batchText.trim() ? '#000' : 'var(--text-muted)',
                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    {loading ? <RefreshCw size={14} className="spin" /> : <ArrowRight size={14} />} Parse All
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Batch results */}
                    {batchResult && !batchResult.error && (
                        <div>
                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                                <div className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: '#4CAF50' }}>{batchResult.stats?.successful || batchResult.parsed?.length || 0}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Parsed</div>
                                </div>
                                <div className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: '#F44336' }}>{batchResult.stats?.failed || batchResult.failed?.length || 0}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Failed</div>
                                </div>
                                <div className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
                                    <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(batchResult.stats?.totalAmount || 0)}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Amount</div>
                                </div>
                            </div>

                            {/* Parsed list */}
                            {batchResult.parsed?.length > 0 && (
                                <div className="glass-card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Parsed Transactions ({batchResult.parsed.length})</span>
                                        <button onClick={handleImport} disabled={importing} style={{
                                            padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                            background: 'var(--accent)', color: '#000', fontWeight: 600, fontSize: 13,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                        }}>
                                            {importing ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />} Import All
                                        </button>
                                    </div>
                                    {batchResult.parsed.map((tx, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                                            borderBottom: i < batchResult.parsed.length - 1 ? '1px solid var(--card-border)' : 'none',
                                        }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: tx.type === 'DEBIT' ? '#F44336' : '#4CAF50',
                                            }} />
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{tx.merchant || tx.category || 'Unknown'}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{tx.category}</span>
                                            </div>
                                            <span style={{ fontWeight: 700, color: tx.type === 'DEBIT' ? '#F44336' : '#4CAF50' }}>
                                                {tx.type === 'DEBIT' ? '-' : '+'}{fmt(tx.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {batchResult?.error && (
                        <div className="glass-card" style={{ padding: 20, color: '#F44336', display: 'flex', gap: 8 }}>
                            <AlertTriangle size={18} /> {batchResult.error}
                        </div>
                    )}

                    {/* Import result */}
                    {importResult && !importResult.error && (
                        <div className="glass-card" style={{ padding: 20, borderLeft: '4px solid #4CAF50' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#4CAF50' }}>
                                <CheckCircle size={20} /> <span style={{ fontWeight: 700, fontSize: 16 }}>Import Complete!</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Imported</div>
                                    <div style={{ fontWeight: 700, fontSize: 18 }}>{importResult.imported || 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Duplicates Skipped</div>
                                    <div style={{ fontWeight: 700, fontSize: 18, color: '#FF9800' }}>{importResult.duplicates || 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Failed</div>
                                    <div style={{ fontWeight: 700, fontSize: 18, color: '#F44336' }}>{importResult.failed || 0}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {importResult?.error && (
                        <div className="glass-card" style={{ padding: 20, color: '#F44336', display: 'flex', gap: 8, marginTop: 12 }}>
                            <AlertTriangle size={18} /> {importResult.error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
