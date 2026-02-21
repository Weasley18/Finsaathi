import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TrendingUp, CheckCircle, X, Clock, Tag } from 'lucide-react';

const categoryColors = {
    savings: { bg: 'rgba(76, 175, 80, 0.1)', text: 'var(--success)', label: 'Savings' },
    investment: { bg: 'rgba(52, 152, 219, 0.1)', text: 'var(--info)', label: 'Investment' },
    insurance: { bg: 'rgba(155, 89, 182, 0.1)', text: '#9b59b6', label: 'Insurance' },
    debt: { bg: 'rgba(231, 76, 60, 0.1)', text: 'var(--error)', label: 'Debt' },
    general: { bg: 'rgba(186, 143, 13, 0.1)', text: 'var(--accent)', label: 'General' },
};

const statusIcons = {
    sent: { icon: Clock, color: 'var(--text-muted)', label: 'New' },
    viewed: { icon: Clock, color: 'var(--info)', label: 'Viewed' },
    accepted: { icon: CheckCircle, color: 'var(--success)', label: 'Accepted' },
    dismissed: { icon: X, color: 'var(--error)', label: 'Dismissed' },
};

export default function RecommendationsPage() {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadRecommendations();
    }, []);

    const loadRecommendations = async () => {
        try {
            const res = await api.getRecommendations();
            setRecommendations(res.recommendations || []);
        } catch (err) {
            console.error('Failed to load recommendations', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatus = async (id, status) => {
        try {
            await api.updateRecommendationStatus(id, status);
            setRecommendations(prev => prev.map(r =>
                r.id === id ? { ...r, status } : r
            ));
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const filtered = recommendations.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'pending') return r.status === 'sent' || r.status === 'viewed';
        return r.status === filter;
    });

    if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

    return (
        <div>
            <header className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={22} color="var(--accent)" /> Recommendations
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>Personalized recommendations from your financial advisor</p>
            </header>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'accepted', label: 'Accepted' },
                    { key: 'dismissed', label: 'Dismissed' },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ borderRadius: 20, padding: '6px 16px', fontSize: 12 }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <TrendingUp size={48} strokeWidth={1} />
                    <p style={{ marginTop: 12 }}>No recommendations yet</p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filtered.map(rec => {
                    const cat = categoryColors[rec.category] || categoryColors.general;
                    const status = statusIcons[rec.status] || statusIcons.sent;
                    const StatusIcon = status.icon;

                    return (
                        <div key={rec.id} className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <h4 style={{ margin: 0, fontSize: 16 }}>{rec.title}</h4>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                            background: cat.bg, color: cat.text,
                                        }}>
                                            {cat.label}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        From {rec.advisor?.name || 'Your Advisor'} · {new Date(rec.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: status.color }}>
                                    <StatusIcon size={14} />
                                    {status.label}
                                </div>
                            </div>

                            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>
                                {rec.content}
                            </p>

                            {(rec.status === 'sent' || rec.status === 'viewed') && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '8px 20px', fontSize: 13 }}
                                        onClick={() => handleStatus(rec.id, 'accepted')}
                                    >
                                        <CheckCircle size={14} /> Accept
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 20px', fontSize: 13 }}
                                        onClick={() => handleStatus(rec.id, 'dismissed')}
                                    >
                                        <X size={14} /> Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
