import React, { useState, useEffect } from 'react';
import {
    Users, TrendingUp, Shield, Activity, DollarSign, Database,
    Server, AlertCircle, CheckCircle, Clock, BarChart3
} from 'lucide-react';
import { api } from '../../api';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

// Reusable Stat Card
const StatCard = ({ label, value, icon: Icon, color = 'var(--accent-light)', subtext }) => (
    <div className="glass-card stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
                <div className="label">{label}</div>
                <div className="value">{value ?? '—'}</div>
                {subtext && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtext}</div>}
            </div>
            <div style={{
                padding: 10,
                borderRadius: 12,
                background: `rgba(186, 143, 13, 0.1)`,
                color: color
            }}>
                <Icon size={24} />
            </div>
        </div>
    </div>
);

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAdminStats?.()
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading...</div>;

    const stats = data?.stats || {};
    const userGrowthData = data?.userGrowth || [];
    const roleData = data?.roleDistribution || [];
    const activities = data?.recentActivity || [];

    const hasNoData = !data;

    return (
        <div>
            <header className="page-header">
                <h2>Platform Dashboard</h2>
                <p>System Overview & Health</p>
            </header>

            {hasNoData && (
                <div className="glass-card" style={{ textAlign: 'center', padding: 48, marginBottom: 24 }}>
                    <BarChart3 size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Unable to load platform stats</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Please try again later.</p>
                </div>
            )}

            {/* ─── Top Stats ─── */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <StatCard label="Total Users" value={stats.totalUsers?.toLocaleString()} icon={Users} />
                <StatCard label="Advisors" value={stats.totalAdvisors} icon={Shield} color="var(--success)" subtext={stats.pendingApprovals ? `${stats.pendingApprovals} pending` : undefined} />
                <StatCard label="Active Today" value={stats.activeToday} icon={Activity} color="var(--info)" />
                <StatCard label="Transactions" value={stats.transactions?.toLocaleString()} icon={TrendingUp} color="var(--warning)" />
                <StatCard label="Avg Health" value={stats.avgHealth != null ? stats.avgHealth : '—'} icon={CheckCircle} color="var(--success)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>

                {/* ─── User Growth Chart ─── */}
                <div className="glass-card">
                    <h3 className="section-title">User Growth</h3>
                    {userGrowthData.length > 0 ? (
                        <div style={{ height: 250, width: '100%' }}>
                            <ResponsiveContainer>
                                <AreaChart data={userGrowthData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                    <Area type="monotone" dataKey="users" stroke="var(--accent)" fillOpacity={1} fill="url(#colorUsers)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No growth data available
                        </div>
                    )}
                </div>

                {/* ─── Role Distribution ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Role Distribution</h3>
                    {roleData.some(r => r.value > 0) ? (
                        <div style={{ height: 250, width: '100%' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={roleData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {roleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No user data available
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Activity Feed ─── */}
            <div className="glass-card">
                <h3 className="section-title">Recent Activity</h3>
                {activities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {activities.map((act, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: act.type === 'success' ? 'var(--success)' : act.type === 'warning' ? 'var(--warning)' : 'var(--info)'
                                }} />
                                <div style={{ flex: 1 }}>{act.text}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{act.time}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity</div>
                )}
            </div>
        </div>
    );
}
