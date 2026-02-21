import React, { useState, useEffect } from 'react';
import {
    Package, Users, TrendingUp, Target, ArrowRight, Building2,
    BarChart3, Activity
} from 'lucide-react';
import { api } from '../../api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList
} from 'recharts';

const StatCard = ({ label, value, icon: Icon, color = 'var(--accent-light)', subtext }) => (
    <div className="glass-card stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
                <div className="label">{label}</div>
                <div className="value">{value}</div>
                {subtext && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtext}</div>}
            </div>
            <div style={{
                padding: 10, borderRadius: 12,
                background: 'rgba(186, 143, 13, 0.1)', color
            }}>
                <Icon size={24} />
            </div>
        </div>
    </div>
);

const STATUS_COLORS = {
    MATCHED: 'var(--info)',
    APPLIED: 'var(--warning)',
    ONBOARDED: 'var(--success)',
};

export default function PartnerDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.getPartnerDashboard().catch(() => null),
            api.getPartnerAnalytics().catch(() => null),
        ]).then(([dash, anal]) => {
            setDashboard(dash);
            setAnalytics(anal);
            setLoading(false);
        });
    }, []);

    // Fallback data for demo
    const stats = dashboard?.stats || {
        totalProducts: 5,
        matchedUsers: 342,
        applications: 89,
        onboarded: 47,
        conversionRate: '13.7%',
    };

    const incomeData = analytics?.incomeDistribution?.length > 0
        ? analytics.incomeDistribution
        : [
            { incomeRange: 'Below ₹10K', userCount: 180 },
            { incomeRange: '₹10K–25K', userCount: 420 },
            { incomeRange: '₹25K–50K', userCount: 280 },
            { incomeRange: '₹50K–1L', userCount: 150 },
            { incomeRange: 'Above ₹1L', userCount: 60 },
        ];

    const riskData = analytics?.riskDistribution?.length > 0
        ? analytics.riskDistribution.map(r => ({
            name: r.riskProfile,
            value: r.userCount,
            color: r.riskProfile === 'CONSERVATIVE' ? 'var(--success)' :
                r.riskProfile === 'MODERATE' ? 'var(--warning)' : 'var(--error)'
        }))
        : [
            { name: 'Conservative', value: 420, color: 'var(--success)' },
            { name: 'Moderate', value: 340, color: 'var(--warning)' },
            { name: 'Aggressive', value: 130, color: 'var(--error)' },
        ];

    const funnelData = [
        { name: 'Matched', value: analytics?.uptakeFunnel?.matched || stats.matchedUsers, fill: 'var(--info)' },
        { name: 'Applied', value: analytics?.uptakeFunnel?.applied || stats.applications, fill: 'var(--warning)' },
        { name: 'Onboarded', value: analytics?.uptakeFunnel?.onboarded || stats.onboarded, fill: 'var(--success)' },
    ];

    const recentMatches = dashboard?.recentMatches || [
        { id: 1, productName: 'Micro Business Loan', productType: 'microloan', status: 'MATCHED', matchedAt: new Date().toISOString() },
        { id: 2, productName: 'Crop Insurance Basic', productType: 'insurance', status: 'APPLIED', matchedAt: new Date().toISOString() },
        { id: 3, productName: 'Rural Savings Account', productType: 'savings_account', status: 'ONBOARDED', matchedAt: new Date().toISOString() },
    ];

    return (
        <div>
            <header className="page-header">
                <h2>Partner Dashboard</h2>
                <p>Product Performance & User Analytics</p>
            </header>

            {/* ─── Top Stats ─── */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <StatCard label="Products" value={stats.totalProducts} icon={Package} />
                <StatCard label="Matched Users" value={stats.matchedUsers} icon={Users} color="var(--info)" />
                <StatCard label="Applications" value={stats.applications} icon={TrendingUp} color="var(--warning)" />
                <StatCard label="Onboarded" value={stats.onboarded} icon={Target} color="var(--success)" />
                <StatCard label="Conversion" value={stats.conversionRate} icon={Activity} color="var(--bright-gold)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>

                {/* ─── Income Distribution Chart ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Matched User Income Distribution</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        k-anonymized · Aggregated data only
                    </p>
                    <div style={{ height: 260, width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={incomeData}>
                                <XAxis
                                    dataKey="incomeRange"
                                    stroke="var(--text-muted)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: 12,
                                    }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar
                                    dataKey="userCount"
                                    fill="var(--accent)"
                                    radius={[6, 6, 0, 0]}
                                    name="Users"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ─── Risk Profile Distribution ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Risk Profile</h3>
                    <div style={{ height: 260, width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={riskData}
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {riskData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: 12,
                                    }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="two-col-grid">

                {/* ─── Product Uptake Funnel ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Product Uptake Funnel</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                        {funnelData.map((stage, i) => {
                            const maxVal = funnelData[0].value || 1;
                            const pct = ((stage.value / maxVal) * 100).toFixed(0);
                            return (
                                <div key={stage.name}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{stage.name}</span>
                                        <span style={{ fontWeight: 700 }}>{stage.value}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 10 }}>
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${pct}%`,
                                                background: stage.fill,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Recent Matches ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Recent Matches</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {recentMatches.map((m) => (
                            <div
                                key={m.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px', borderRadius: 12,
                                    background: 'rgba(186, 143, 13, 0.04)',
                                }}
                            >
                                <Building2 size={18} color="var(--text-muted)" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.productName}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.productType}</div>
                                </div>
                                <span
                                    className={`badge ${m.status === 'ONBOARDED' ? 'badge-success' :
                                        m.status === 'APPLIED' ? 'badge-warning' : 'badge-info'
                                        }`}
                                >
                                    {m.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
