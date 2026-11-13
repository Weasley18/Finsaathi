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

const ClientRow = ({ client, onView, goalCount }) => {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <Target size={14} color="var(--accent)" />
                    {goalCount} {goalCount === 1 ? 'Goal' : 'Goals'}
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
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [advisorStats, setAdvisorStats] = useState({ activeGoals: 0, recommendations: 0, clientGoals: {} });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const me = await api.getMe();
            setUser(me.user || me);

            const advisorId = me.user?.id || me.id;
            const res = await api.getAdvisorClients(advisorId);
            setClients(res.clients || []);

            // Load real stats (goals, recommendations counts)
            const statsRes = await api.getAdvisorStats(advisorId).catch(() => ({ activeGoals: 0, recommendations: 0, clientGoals: {} }));
            setAdvisorStats(statsRes);

            // Load live notifications
            const notifRes = await api.getNotifications(5).catch(() => ({ notifications: [], unreadCount: 0 }));
            setNotifications(notifRes.notifications || []);
            setUnreadCount(notifRes.unreadCount || 0);
        } catch (err) {
            console.error("Failed to load advisor data", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(c => {
        if (filter === 'RISK') return (c.healthScore || 0) < 40;
        if (filter === 'ACTIVE') return (c.healthScore || 0) >= 40;
        if (filter === 'NEW') {
            const assigned = new Date(c.assignedAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return assigned >= thirtyDaysAgo;
        }
        return true;
    });

    const stats = {
        totalClients: clients.length,
        avgHealth: clients.length ? Math.round(clients.reduce((acc, c) => acc + (c.healthScore || 0), 0) / clients.length) : 0,
        activeGoals: advisorStats.activeGoals || 0,
        recommendations: advisorStats.recommendations || 0,
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
                    <button className="btn btn-secondary" onClick={() => navigate('/notifications')}>
                        <Bell size={18} /> Notifications
                        {unreadCount > 0 && <span className="badge badge-error" style={{ marginLeft: 6, padding: '2px 6px' }}>{unreadCount}</span>}
                    </button>
                </div>
            </header>

            {/* ─── KPI Stats ─── */}
            <div className="stats-grid">
                <StatCard label="Total Clients" value={stats.totalClients} icon={Users} />
                <StatCard label="Avg Health Score" value={stats.avgHealth} icon={Target} color="var(--success)" />
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
                                    <ClientRow key={client.id} client={client} goalCount={advisorStats.clientGoals?.[client.id] || 0} onView={(c) => navigate(`/advisor/client/${c.id}`)} />
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
                            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => navigate('/advisor/copilot')}>
                                <Send size={18} /> AI Co-Pilot
                            </button>
                            <button className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={() => navigate('/advisor/messages')}>
                                <Users size={18} /> Messages
                            </button>
                            {/* <button className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                                <Target size={18} /> Create Goal Plan
                            </button> */}
                        </div>
                    </div>

                    {/* Live Alerts */}
                    <div className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 className="section-title" style={{ marginBottom: 0 }}>Alerts</h3>
                            {unreadCount > 0 && <span className="badge badge-error">{unreadCount} New</span>}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {notifications.length > 0 ? notifications.slice(0, 5).map((notif) => (
                                <div key={notif.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--divider)' }}>
                                    <div style={{
                                        minWidth: 32, height: 32, borderRadius: 8, background: 'rgba(231,76,60,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)'
                                    }}>
                                        <AlertTriangle size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{notif.title}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{notif.message}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                            {new Date(notif.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                                    No alerts — all looking good! ✨
                                </div>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => navigate('/notifications')}>
                                View All Notifications
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
