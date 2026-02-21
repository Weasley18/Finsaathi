import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { Activity, TrendingUp, TrendingDown, Shield, Target, Wallet, PiggyBank, AlertTriangle, CheckCircle, Info, BarChart3 } from 'lucide-react';

const STATUS_COLORS = {
    great: { bg: 'rgba(76,175,80,0.12)', color: '#4CAF50', icon: CheckCircle },
    moderate: { bg: 'rgba(255,152,0,0.12)', color: '#FF9800', icon: Info },
    needs_improvement: { bg: 'rgba(244,67,54,0.12)', color: '#F44336', icon: AlertTriangle },
    no_data: { bg: 'rgba(158,158,158,0.12)', color: '#9E9E9E', icon: Info },
};

const FACTOR_ICONS = {
    savingsRate: PiggyBank,
    goalProgress: Target,
    budgetDiscipline: Wallet,
    debtToIncome: Shield,
    emergencyFund: AlertTriangle,
    spendingConsistency: Activity,
};

export default function HealthScorePage() {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        api.getHealthScore?.()
            .then(d => { setData(d); setLoading(false); })
            .catch(() => { setError(true); setLoading(false); });
    }, []);

    const getScoreColor = (s) => {
        if (s === null || s === undefined) return '#9E9E9E';
        if (s >= 80) return '#4CAF50';
        if (s >= 60) return '#FF9800';
        if (s >= 40) return '#FFC107';
        return '#F44336';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div>
                <header className="page-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={22} color="var(--accent)" /> {t('health.title')}
                    </h2>
                </header>
                <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
                    <AlertTriangle size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Unable to load health score</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Please try again later.</p>
                </div>
            </div>
        );
    }

    const d = data;
    const score = d.healthScore;
    const noData = d.dataAvailable === false;

    return (
        <div>
            <header className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={22} color="var(--accent)" /> {t('health.title')}
                </h2>
                <p>{d.model || t('health.subtitle')}</p>
            </header>

            {/* No Data Empty State */}
            {noData ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: 48, marginBottom: 24 }}>
                    <BarChart3 size={56} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
                    <div style={{
                        width: 160, height: 160, borderRadius: '50%', margin: '0 auto 16px',
                        border: '6px dashed var(--text-muted)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        opacity: 0.5,
                    }}>
                        <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--text-muted)' }}>--</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>No Data</div>
                    </div>
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 18 }}>No Financial Data Yet</h3>
                    <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
                        {d.gradeDescription}
                    </p>
                </div>
            ) : (
                /* Score Circle */
                <div className="glass-card" style={{ textAlign: 'center', padding: 32, marginBottom: 24 }}>
                    <div style={{
                        width: 160, height: 160, borderRadius: '50%', margin: '0 auto 16px',
                        border: `6px solid ${getScoreColor(score)}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: `${getScoreColor(score)}11`,
                    }}>
                        <div style={{ fontSize: 48, fontWeight: 900, color: getScoreColor(score) }}>{score !== null ? score : '--'}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{d.grade || 'N/A'}</div>
                    </div>
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                        {d.gradeDescription}
                    </p>
                    {d.trend && d.trend.spendingVsLastMonth !== 'N/A' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                            {d.trend.direction === 'down' ? <TrendingDown size={16} color="#4CAF50" /> : <TrendingUp size={16} color="#F44336" />}
                            <span style={{ fontSize: 13, color: d.trend.direction === 'down' ? '#4CAF50' : '#F44336' }}>
                                Spending {d.trend.spendingVsLastMonth} vs last month
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Feature Attribution */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{t('health.scoreBreakdown')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginBottom: 24 }}>
                {d.featureAttribution && Object.entries(d.featureAttribution).map(([key, attr]) => {
                    const isNoData = attr.status === 'no_data' || attr.score === null;
                    const statusStyle = STATUS_COLORS[attr.status] || STATUS_COLORS.no_data;
                    const Icon = FACTOR_ICONS[key] || Activity;
                    const StatusIcon = statusStyle.icon;
                    return (
                        <div key={key} className="glass-card" style={{ padding: 16, opacity: isNoData ? 0.65 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Icon size={18} color={statusStyle.color} />
                                    <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{attr.weight}</span>
                            </div>

                            {isNoData ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                                        <div className="progress-bar-fill" style={{ width: '0%', background: '#9E9E9E' }} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#9E9E9E', minWidth: 32, textAlign: 'right' }}>--</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                                        <div className="progress-bar-fill" style={{ width: `${attr.score}%`, background: statusStyle.color }} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: statusStyle.color, minWidth: 32, textAlign: 'right' }}>{attr.score}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <StatusIcon size={12} color={statusStyle.color} />
                                <span style={{ fontSize: 12, color: statusStyle.color, fontWeight: 600 }}>{attr.value}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{attr.insight}</div>
                        </div>
                    );
                })}
            </div>

            {/* Tips */}
            {d.tips?.length > 0 && (
                <div className="glass-card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('health.personalizedTips')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {d.tips.map((tip, i) => (
                            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>
                                {tip}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
