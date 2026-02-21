import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, TrendingUp, Target, Send, Search, Bell, ChevronRight,
    MapPin, Phone, AlertTriangle, CheckCircle
} from 'lucide-react';
import { api } from '../../api';

// Reusable Components matching Liquid Glass theme

const StatCard = ({ label, value, trend, icon: Icon, color = 'var(--accent-light)' }) => (
    <div className="glass-card stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
                <div className="label">{label}</div>
                <div className="value">{value}</div>
                {trend && (
                    <div className="trend" style={{ color: trend > 0 ? 'var(--success)' : 'var(--error)' }}>
                        <TrendingUp size={14} /> {Math.abs(trend)}% vs last month
                    </div>
                )}
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

const ClientRow = ({ client, onView }) => {
    const healthScore = client.healthScore || 0;
    let healthColor = 'var(--error)';
    if (healthScore >= 70) healthColor = 'var(--success)';
    else if (healthScore >= 40) healthColor = 'var(--warning)';

    return (
        <tr onClick={() => onView(client)} style={{ cursor: 'pointer' }}>
            <td>
                <div className="user-item">
                    <div className="user-avatar">{client.name[0]}</div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{client.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{client.phone}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        border: `3px solid ${healthColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700
                    }}>
                        {healthScore}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 100</span>
                </div>
            </td>
            <td>
                {/* Mock Data for now */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <Target size={14} color="var(--accent)" />
                    {Math.floor(Math.random() * 3) + 1} Goals
                </div>
            </td>
            <td>
                <div className={`badge ${healthScore < 40 ? 'badge-error' : 'badge-success'}`}>
                    {healthScore < 40 ? 'At Risk' : 'Active'}
                </div>
            </td>
            <td>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                    View
                </button>
            </td>
        </tr>
    );
};

export default function AdvisorDashboard() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, ACTIVE, RISK, NEW
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const me = await api.getMe();
            setUser(me.user || me);

            const res = await api.getAdvisorClients(me.user?.id || me.id);
            setClients(res.clients || []);
        } catch (err) {
            console.error("Failed to load advisor data", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(c => {
        if (filter === 'RISK') return (c.healthScore || 0) < 40;
        if (filter === 'ACTIVE') return (c.healthScore || 0) >= 40;
        // New logic could be based on created date, mocking for now
        if (filter === 'NEW') return false;
        return true;
    });

    const stats = {
        totalClients: clients.length,
        avgHealth: clients.length ? Math.round(clients.reduce((acc, c) => acc + (c.healthScore || 0), 0) / clients.length) : 0,
        activeGoals: 128, // Mock
        recommendations: 89 // Mock
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading Dashboard...</div>;

    return (
        <div>
            {/* ─── Header ─── */}
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <div>
                    <h2>Advisor Dashboard</h2>
                    <p>Welcome back, {user?.name}</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary">
                        <Bell size={18} /> Notifications
                        <span className="badge badge-error" style={{ marginLeft: 6, padding: '2px 6px' }}>3</span>
                    </button>
                </div>
            </header>

            {/* ─── KPI Stats ─── */}
            <div className="stats-grid">
                <StatCard label="Total Clients" value={stats.totalClients} trend={12} icon={Users} />
                <StatCard label="Avg Health Score" value={stats.avgHealth} trend={5} icon={Target} color="var(--success)" />
                <StatCard label="Active Goals" value={stats.activeGoals} icon={TrendingUp} color="var(--info)" />
                <StatCard label="Recommendations" value={stats.recommendations} icon={Send} color="var(--warning)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }}>

                {/* ─── Client List Section ─── */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h3 className="section-title" style={{ marginBottom: 0 }}>My Clients</h3>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    className="input"
                                    style={{ paddingLeft: 36, width: 200 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        {['ALL', 'ACTIVE', 'RISK', 'NEW'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ borderRadius: 20, padding: '6px 16px', fontSize: 12 }}
                            >
                                {f === 'ALL' ? 'All Clients' : f === 'RISK' ? 'At Risk' : f.charAt(0) + f.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th>Health Score</th>
                                    <th>Goals</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map(client => (
                                    <ClientRow key={client.id} client={client} onView={(c) => navigate(`/advisor/client/${c.id}`)} />
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                            No clients found matching filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ─── Right Panel: Quick Actions & Alerts ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Quick Actions */}
                    <div className="glass-card">
                        <h3 className="section-title">Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button className="btn btn-primary" style={{ justifyContent: 'center' }}>
                                <Send size={18} /> Send Recommendation
                            </button>
                            <button className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                                <Users size={18} /> Add New Client
                            </button>
                            <button className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                                <Target size={18} /> Create Goal Plan
                            </button>
                        </div>
                    </div>

                    {/* Alerts */}
                    <div className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 className="section-title" style={{ marginBottom: 0 }}>Alerts</h3>
                            <span className="badge badge-error">3 Priority</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[
                                { name: 'Rakesh S.', issue: 'Budget exceeded by 20%', time: '2h ago' },
                                { name: 'Meena K.', issue: 'Missed SIP payment', time: '5h ago' },
                                { name: 'Anil T.', issue: 'Emergency fund low', time: '1d ago' },
                            ].map((alert, i) => (
                                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--divider)' }}>
                                    <div style={{
                                        minWidth: 32, height: 32, borderRadius: 8, background: 'rgba(231,76,60,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)'
                                    }}>
                                        <AlertTriangle size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{alert.name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{alert.issue}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{alert.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
