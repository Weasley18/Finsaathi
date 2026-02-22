import React, { useState, useEffect } from 'react';
import {
    Users, Shield, Star, Award, CheckCircle, XCircle, Search, UserPlus, X
} from 'lucide-react';
import { api } from '../../api';

export default function AdvisorManagement() {
    const [advisors, setAdvisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, PREMIUM, FREE
    // Assign-client modal state
    const [assignModal, setAssignModal] = useState({ open: false, advisorId: null, advisorName: '' });
    const [clients, setClients] = useState([]);
    const [clientSearch, setClientSearch] = useState('');
    const [clientsLoading, setClientsLoading] = useState(false);
    const [assigning, setAssigning] = useState(null); // clientId currently being assigned

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

    const openAssignModal = async (advisorId, advisorName) => {
        setAssignModal({ open: true, advisorId, advisorName });
        setClientSearch('');
        setClientsLoading(true);
        try {
            const res = await api.getUsers({ role: 'END_USER' });
            setClients(res.users || []);
        } catch {
            setClients([]);
        } finally {
            setClientsLoading(false);
        }
    };

    const handleAssignClient = async (clientId) => {
        setAssigning(clientId);
        try {
            await api.assignClient(assignModal.advisorId, clientId);
            setAssignModal({ open: false, advisorId: null, advisorName: '' });
            loadAdvisors();
        } catch (err) {
            alert("Assignment failed: " + err.message);
        } finally {
            setAssigning(null);
        }
    };

    const filteredClients = clients.filter(c => {
        if (!clientSearch) return true;
        const q = clientSearch.toLowerCase();
        return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
    });

    const filteredAdvisors = advisors.filter(adv => {
        if (filter === 'PREMIUM') return adv.tier === 'PREMIUM';
        if (filter === 'FREE') return adv.tier !== 'PREMIUM';
        return true;
    });

    const stats = {
        total: advisors.length,
        premium: advisors.filter(a => a.tier === 'PREMIUM').length,
        free: advisors.filter(a => a.tier !== 'PREMIUM').length,
        pending: advisors.filter(a => a.status === 'PENDING').length
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
                                            <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => openAssignModal(adv.id, adv.name)}>
                                                <UserPlus size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ─── Pending Approvals ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Pending Approvals</h3>
                    {stats.pending === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No pending approvals
                        </div>
                    ) : (
                        advisors.filter(a => a.status === 'PENDING').map(adv => (
                            <div key={adv.id} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--divider)' }}>
                                <div style={{ fontWeight: 600 }}>{adv.user?.name || 'Unknown'}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{adv.user?.phone || '—'}</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-primary" style={{ flex: 1, padding: 8, fontSize: 12 }}>Approve</button>
                                    <button className="btn btn-secondary" style={{ flex: 1, padding: 8, fontSize: 12, color: 'var(--error)' }}>Reject</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>

            {/* ─── Assign Client Modal ─── */}
            {assignModal.open && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => setAssignModal({ open: false, advisorId: null, advisorName: '' })}>
                    <div
                        className="glass-card"
                        style={{ width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', padding: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid var(--divider)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    Assign Client to {assignModal.advisorName}
                                </h3>
                                <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                                    onClick={() => setAssignModal({ open: false, advisorId: null, advisorName: '' })}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                                <input
                                    className="input"
                                    placeholder="Search by name or phone..."
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    style={{ paddingLeft: 32, width: '100%' }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Client List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 20px' }}>
                            {clientsLoading ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading clients...</div>
                            ) : filteredClients.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {clientSearch ? 'No clients match your search' : 'No clients available'}
                                </div>
                            ) : (
                                filteredClients.map(c => (
                                    <div
                                        key={c.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 12px', borderRadius: 12, marginBottom: 4,
                                            background: 'rgba(186,143,13,0.04)',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,143,13,0.12)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(186,143,13,0.04)'}
                                    >
                                        <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                                            {(c.name || '?')[0].toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name || 'Unnamed'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.phone}</div>
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '6px 14px', fontSize: 12 }}
                                            disabled={assigning === c.id}
                                            onClick={() => handleAssignClient(c.id)}
                                        >
                                            {assigning === c.id ? 'Assigning...' : 'Assign'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
