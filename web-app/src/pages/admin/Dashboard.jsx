import React, { useState, useEffect } from 'react';
import {
    Users, TrendingUp, Shield, Activity, DollarSign, Database,
    Server, AlertCircle, CheckCircle, Clock
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
                <div className="value">{value}</div>
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

const userGrowthData = [
    { month: 'Jan', users: 120 }, { month: 'Feb', users: 350 },
    { month: 'Mar', users: 800 }, { month: 'Apr', users: 1500 },
    { month: 'May', users: 2100 }, { month: 'Jun', users: 2847 } // Current
];

const roleData = [
    { name: 'End Users', value: 2847, color: 'var(--accent)' },
    { name: 'Advisors', value: 34, color: 'var(--success)' },
    { name: 'Admins', value: 4, color: 'var(--error)' }
];

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 2847,
        totalAdvisors: 34,
        activeToday: 456,
        transactions: 1203,
        avgHealth: 64,
        revenue: 42.5 // Lakhs
    });

    // Mock activity feed
    const activities = [
        { text: 'New advisor application: Rahul V.', time: '10m ago', type: 'info' },
        { text: 'System backup completed successfully', time: '1h ago', type: 'success' },
        { text: 'High transaction volume detected', time: '2h ago', type: 'warning' },
        { text: 'New lesson "Mutual Funds 101" published', time: '4h ago', type: 'info' },
    ];

    return (
        <div>
            <header className="page-header">
                <h2>Platform Dashboard</h2>
                <p>System Overview & Health</p>
            </header>

            {/* ─── Top Stats ─── */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} subtext="+12% this month" />
                <StatCard label="Advisors" value={stats.totalAdvisors} icon={Shield} color="var(--success)" subtext="2 pending" />
                <StatCard label="Active Today" value={stats.activeToday} icon={Activity} color="var(--info)" />
                <StatCard label="Transactions" value={stats.transactions} icon={TrendingUp} color="var(--warning)" />
                <StatCard label="Avg Health" value={stats.avgHealth} icon={CheckCircle} color="var(--success)" />
                <StatCard label="Revenue" value={`₹${stats.revenue}L`} icon={DollarSign} color="var(--bright-gold)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>

                {/* ─── User Growth Chart ─── */}
                <div className="glass-card">
                    <h3 className="section-title">User Growth</h3>
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
                </div>

                {/* ─── Role Distribution ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Role Distribution</h3>
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
                </div>
            </div>

            <div className="two-col-grid">

                {/* ─── Activity Feed ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Recent Activity</h3>
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
                </div>

                {/* ─── System Status ─── */}
                <div className="glass-card">
                    <h3 className="section-title">System Health</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                            { label: 'API Server', status: 'Healthy', color: 'var(--success)', icon: Server },
                            { label: 'Database', status: '28ms', color: 'var(--success)', icon: Database },
                            { label: 'AI Service', status: 'Degraded', color: 'var(--warning)', icon: Activity },
                            { label: 'Storage', status: '42% Used', color: 'var(--success)', icon: Database },
                        ].map((sys, i) => (
                            <div key={i} className="glass-card-flat" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <sys.icon size={20} color={sys.color} />
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sys.label}</div>
                                    <div style={{ fontWeight: 600, color: sys.color }}>{sys.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
