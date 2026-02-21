import React, { useState, useEffect } from 'react';
import {
    Users, Shield, Star, Award, CheckCircle, XCircle, Search, UserPlus
} from 'lucide-react';
import { api } from '../../api';

export default function AdvisorManagement() {
    const [advisors, setAdvisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, PREMIUM, FREE

    useEffect(() => {
        loadAdvisors();
    }, []);

    const loadAdvisors = async () => {
        try {
            const res = await api.getAdvisors();
            setAdvisors(res.advisors || []);
        } catch (err) {
            console.error("Failed to load advisors", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTier = async (id, newTier) => {
        try {
            await api.updateAdvisorTier(id, newTier);
            loadAdvisors(); // Refresh
        } catch (err) {
            alert("Failed to update tier");
        }
    };

    const handleAssignClient = async (advisorId) => {
        const clientId = prompt("Enter Client ID to assign:"); // Simple for now
        if (!clientId) return;
        try {
            await api.assignClient(advisorId, clientId);
            alert("Client assigned successfully");
            loadAdvisors();
        } catch (err) {
            alert("Assignment failed: " + err.message);
        }
    };

    const filteredAdvisors = advisors.filter(adv => {
        if (filter === 'PREMIUM') return adv.tier === 'PREMIUM';
        if (filter === 'FREE') return adv.tier !== 'PREMIUM';
        return true;
    });

    const stats = {
        total: advisors.length,
        premium: advisors.filter(a => a.tier === 'PREMIUM').length,
        free: advisors.filter(a => a.tier !== 'PREMIUM').length,
        pending: 2 // Mock
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading advisors...</div>;

    return (
        <div>
            <header className="page-header">
                <h2>Advisor Management</h2>
                <p>Manage advisor tiers and client assignments</p>
            </header>

            {/* ─── Stats Row ─── */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="glass-card stat-card">
                    <div className="label">Total Advisors</div>
                    <div className="value">{stats.total}</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="label" style={{ color: 'var(--accent-light)' }}>Premium</div>
                    <div className="value" style={{ color: 'var(--accent-light)' }}>{stats.premium}</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="label">Free Tier</div>
                    <div className="value">{stats.free}</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="label" style={{ color: 'var(--warning)' }}>Pending</div>
                    <div className="value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24 }}>

                {/* ─── Advisor List ─── */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['ALL', 'PREMIUM', 'FREE'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ borderRadius: 20, padding: '6px 16px', fontSize: 12 }}
                                >
                                    {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                            <input className="input" placeholder="Search..." style={{ paddingLeft: 32, width: 200 }} />
                        </div>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Advisor</th>
                                <th>Tier</th>
                                <th>Clients</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdvisors.map(adv => (
                                <tr key={adv.id}>
                                    <td>
                                        <div className="user-item" style={{ padding: 0 }}>
                                            <div className="user-avatar">{adv.name[0]}</div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{adv.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{adv.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {adv.tier === 'PREMIUM' ? (
                                            <span className="badge badge-gold"><Star size={10} style={{ marginRight: 4 }} fill="currentColor" /> Premium</span>
                                        ) : (
                                            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>Free</span>
                                        )}
                                    </td>
                                    <td>{adv._count?.advisorClients || 0} Clients</td>
                                    <td>
                                        <span className="badge badge-success" style={{ borderRadius: '50%', width: 10, height: 10, padding: 0, display: 'inline-block' }}></span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {adv.tier !== 'PREMIUM' ? (
                                                <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleUpdateTier(adv.id, 'PREMIUM')}>
                                                    Upgrade
                                                </button>
                                            ) : (
                                                <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleUpdateTier(adv.id, 'FREE')}>
                                                    Downgrade
                                                </button>
                                            )}
                                            <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => handleAssignClient(adv.id)}>
                                                <UserPlus size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ─── Pending Applications (Mock) ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Pending Approvals</h3>
                    {[1, 2].map(i => (
                        <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--divider)' }}>
                            <div style={{ fontWeight: 600 }}>Amit Sharma</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>+91 98765 4321{i}</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary" style={{ flex: 1, padding: 8, fontSize: 12 }}>Approve</button>
                                <button className="btn btn-secondary" style={{ flex: 1, padding: 8, fontSize: 12, color: 'var(--error)' }}>Reject</button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
