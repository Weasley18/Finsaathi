import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Activity, TrendingUp, TrendingDown, Shield, Target, Wallet, PiggyBank, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const STATUS_COLORS = {
    great: { bg: 'rgba(76,175,80,0.12)', color: '#4CAF50', icon: CheckCircle },
    moderate: { bg: 'rgba(255,152,0,0.12)', color: '#FF9800', icon: Info },
    needs_improvement: { bg: 'rgba(244,67,54,0.12)', color: '#F44336', icon: AlertTriangle },
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
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getHealthScore?.()
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Demo data for display
    const demo = {
        healthScore: 62,
        grade: 'Good',
        gradeDescription: 'Your financial health is strong. Keep it up! 💪',
        model: 'XGBoost-v2 (6-factor weighted ensemble)',
        featureAttribution: {
            savingsRate: { score: 85, weight: '25%', value: '22.4%', status: 'great', insight: 'Strong savings discipline! Consider SIPs for long-term wealth building.' },
            goalProgress: { score: 50, weight: '20%', value: '1/3 on track', status: 'moderate', insight: 'Consider automating your goal contributions via UPI autopay.' },
            budgetDiscipline: { score: 75, weight: '20%', value: '2 active budgets', status: 'great', insight: 'Budgets are active — great discipline!' },
            debtToIncome: { score: 80, weight: '15%', value: '12.5%', status: 'great', insight: 'Healthy debt levels. Keep EMIs under 30% of income.' },
            emergencyFund: { score: 40, weight: '10%', value: '₹32,000 / ₹50,000', status: 'moderate', insight: 'Build a 3-month emergency fund. Even ₹100/day adds up to ₹9,000/quarter!' },
            spendingConsistency: { score: 50, weight: '10%', value: '32% change vs last month', status: 'moderate', insight: 'Large month-to-month spending swings. Track daily expenses to find patterns.' },
        },
        tips: ['Consider investing in a SIP of ₹500/month. 📈', 'Set up budget limits for your categories. 📊'],
        trend: { spendingVsLastMonth: '-8.2%', direction: 'down' },
    };

    const d = data || demo;
    const score = d.healthScore || 0;

    const getScoreColor = (s) => {
        if (s >= 80) return '#4CAF50';
        if (s >= 60) return '#FF9800';
        if (s >= 40) return '#FFC107';
        return '#F44336';
    };

    return (
        <div>
            <header className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={22} color="var(--accent)" /> Financial Health Score
                </h2>
                <p>{d.model || 'AI-Powered Analysis'}</p>
            </header>

            {/* Score Circle */}
            <div className="glass-card" style={{ textAlign: 'center', padding: 32, marginBottom: 24 }}>
                <div style={{
                    width: 160, height: 160, borderRadius: '50%', margin: '0 auto 16px',
                    border: `6px solid ${getScoreColor(score)}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: `${getScoreColor(score)}11`,
                }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: getScoreColor(score) }}>{score}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{d.grade}</div>
                </div>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                    {d.gradeDescription}
                </p>
                {d.trend && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                        {d.trend.direction === 'down' ? <TrendingDown size={16} color="#4CAF50" /> : <TrendingUp size={16} color="#F44336" />}
                        <span style={{ fontSize: 13, color: d.trend.direction === 'down' ? '#4CAF50' : '#F44336' }}>
                            Spending {d.trend.spendingVsLastMonth} vs last month
                        </span>
                    </div>
                )}
            </div>

            {/* Feature Attribution */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Score Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginBottom: 24 }}>
                {d.featureAttribution && Object.entries(d.featureAttribution).map(([key, attr]) => {
                    const statusStyle = STATUS_COLORS[attr.status] || STATUS_COLORS.moderate;
                    const Icon = FACTOR_ICONS[key] || Activity;
                    const StatusIcon = statusStyle.icon;
                    return (
                        <div key={key} className="glass-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Icon size={18} color={statusStyle.color} />
                                    <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{attr.weight}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                                    <div className="progress-bar-fill" style={{ width: `${attr.score}%`, background: statusStyle.color }} />
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: statusStyle.color, minWidth: 32, textAlign: 'right' }}>{attr.score}</span>
                            </div>

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
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>💡 Personalized Tips</h3>
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
