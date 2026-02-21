import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Target, PiggyBank, Activity } from 'lucide-react';

const COLORS = ['#ba8f0d', '#D4AF37', '#ff9f43', '#54a0ff', '#4caf50', '#e74c3c', '#a55eea', '#e84393'];

export default function UserDashboard() {
    const { t } = useTranslation();
    const [dashboard, setDashboard] = useState(null);
    const [categoryData, setCategoryData] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.getDashboard().catch(() => null),
            api.getSpendingByCategory().catch(() => []),
            api.getMonthlyTrend().catch(() => []),
        ]).then(([dash, cats, trend]) => {
            setDashboard(dash);
            setCategoryData(Array.isArray(cats) ? cats : []);
            setMonthlyTrend(Array.isArray(trend) ? trend : []);
            setLoading(false);
        });
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>{t('common.loading')}</div>;

    const summary = dashboard?.summary || {};
    const recentTxns = dashboard?.recentTransactions || [];
    const goals = dashboard?.goals || [];

    return (
        <div>
            <div className="page-header">
                <h2>{t('dashboard.title')}</h2>
                <p>{t('dashboard.welcomeBack', { name: dashboard?.user?.name || 'User' })}</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="glass-card stat-card fade-in-up delay-1">
                    <div className="label">{t('dashboard.totalIncome')}</div>
                    <div className="value" style={{ color: 'var(--success)' }}>₹{(summary.totalIncome || 0).toLocaleString('en-IN')}</div>
                    <div className="trend"><TrendingUp size={14} /> {t('dashboard.thisMonth')}</div>
                </div>
                <div className="glass-card stat-card fade-in-up delay-2">
                    <div className="label">{t('dashboard.totalExpenses')}</div>
                    <div className="value" style={{ color: 'var(--error)' }}>₹{(summary.totalExpenses || 0).toLocaleString('en-IN')}</div>
                    <div className="trend negative"><TrendingDown size={14} /> {t('dashboard.thisMonth')}</div>
                </div>
                <div className="glass-card stat-card fade-in-up delay-3">
                    <div className="label">{t('dashboard.savings')}</div>
                    <div className="value" style={{ color: 'var(--accent-light)' }}>₹{(summary.savings || 0).toLocaleString('en-IN')}</div>
                    <div className="trend"><PiggyBank size={14} /> {t('dashboard.net')}</div>
                </div>
                <div className="glass-card stat-card fade-in-up delay-4">
                    <div className="label">{t('dashboard.healthScore')}</div>
                    <div className="value" style={{ color: 'var(--bright-gold)' }}>{summary.healthScore != null ? `${summary.healthScore}/100` : '—'}</div>
                    <div className="trend"><Activity size={14} /> {summary.healthScore != null ? t('dashboard.score') : 'No data'}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="two-col-grid">
                {/* Spending by Category */}
                <div className="glass-card chart-container fade-in-up">
                    <h3 className="section-title">{t('dashboard.spendingByCategory')}</h3>
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    dataKey="amount"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    innerRadius={50}
                                    paddingAngle={3}
                                >
                                    {categoryData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1a0d00', border: '1px solid rgba(186,143,13,0.2)', borderRadius: 12 }}
                                    labelStyle={{ color: '#D4AF37' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No data</p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {categoryData.map((c, i) => (
                            <span key={i} className="badge badge-gold" style={{ fontSize: 11 }}>
                                <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS[i % COLORS.length], display: 'inline-block', marginRight: 6 }} />
                                {c.category}: ₹{c.amount?.toLocaleString('en-IN')}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="glass-card chart-container fade-in-up">
                    <h3 className="section-title">{t('dashboard.monthlyTrend')}</h3>
                    {monthlyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(186,143,13,0.1)" />
                                <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ background: '#1a0d00', border: '1px solid rgba(186,143,13,0.2)', borderRadius: 12 }}
                                />
                                <Line type="monotone" dataKey="income" stroke="var(--success)" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="expenses" stroke="var(--error)" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No trend data</p>
                    )}
                </div>
            </div>

            {/* Goals */}
            {goals.length > 0 && (
                <div className="fade-in-up" style={{ marginBottom: 32 }}>
                    <h3 className="section-title">{t('dashboard.savingsGoals')}</h3>
                    <div className="stats-grid">
                        {goals.map(g => {
                            const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount * 100) : 0;
                            return (
                                <div key={g.id} className="glass-card" style={{ padding: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>{g.name}</strong>
                                        <span className="badge badge-gold">{progress.toFixed(0)}%</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                        ₹{g.currentAmount?.toLocaleString('en-IN')} / ₹{g.targetAmount?.toLocaleString('en-IN')}
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Transactions */}
            <div className="glass-card fade-in-up">
                <h3 className="section-title">{t('dashboard.recentTransactions')}</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('dashboard.description')}</th>
                            <th>{t('dashboard.category')}</th>
                            <th>{t('dashboard.date')}</th>
                            <th>{t('dashboard.amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTxns.slice(0, 10).map((t, i) => (
                            <tr key={t.id || i}>
                                <td>{t.merchant || t.description || '—'}</td>
                                <td><span className="badge badge-gold">{t.category}</span></td>
                                <td style={{ color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                                <td style={{ color: t.type === 'EXPENSE' ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                                    {t.type === 'EXPENSE' ? '−' : '+'}₹{t.amount?.toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
