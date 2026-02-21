import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { RefreshCw, Search, CheckCircle, XCircle, FileText, ChevronRight, User, Briefcase, Clock, X } from 'lucide-react';

export default function PendingApprovals() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await api.getPendingApprovals();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error fetching approvals', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedUser) return;
        try {
            await api.approveUser(selectedUser.id);
            setUsers(users.filter(u => u.id !== selectedUser.id));
            setSelectedUser(null);
        } catch (error) {
            console.error('Failed to approve', error);
            alert('Failed to approve');
        }
    };

    const handleReject = async () => {
        if (!selectedUser || !rejectReason.trim()) return;
        try {
            await api.rejectUser(selectedUser.id, rejectReason);
            setUsers(users.filter(u => u.id !== selectedUser.id));
            setSelectedUser(null);
            setShowRejectInput(false);
            setRejectReason('');
        } catch (error) {
            console.error('Failed to reject', error);
            alert('Failed to reject');
        }
    };

    return (
        <div style={{ padding: '24px 40px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: '#d4af35' }}>Pending Approvals</h1>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                        Review and verify Partner and Advisor applications.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: 8,
                        cursor: 'pointer'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* ─── Table ────────────────────────────────────── */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                                <th style={{ padding: '16px 24px', fontWeight: 500 }}>Name</th>
                                <th style={{ padding: '16px 24px', fontWeight: 500 }}>Application Date</th>
                                <th style={{ padding: '16px 24px', fontWeight: 500 }}>Type</th>
                                <th style={{ padding: '16px 24px', fontWeight: 500 }}>Status</th>
                                <th style={{ padding: '16px 24px', fontWeight: 500 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr
                                    key={u.id}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: selectedUser?.id === u.id ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onClick={() => setSelectedUser(u)}
                                >
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: 500 }}>{u.name || 'N/A'}</div>
                                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{u.phone}</div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20, fontSize: 12
                                        }}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            background: 'rgba(212, 175, 55, 0.2)', color: '#d4af35', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                                        }}>
                                            PENDING
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: 'rgba(255,255,255,0.3)' }}>
                                        <ChevronRight size={18} />
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                        No pending applications.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ─── Drawer ───────────────────────────────────── */}
                {selectedUser && (
                    <div style={{
                        width: 400,
                        background: 'rgba(20, 15, 10, 0.6)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        borderRadius: 16,
                        backdropFilter: 'blur(20px)',
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100vh - 100px)',
                        position: 'sticky',
                        top: 24
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#d4af35', margin: 0 }}>Review Details</h2>
                            <button onClick={() => { setSelectedUser(null); setShowRejectInput(false); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                            {/* Personal Info */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> Personal Info</div>
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16 }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Full Name</div>
                                        <div style={{ fontSize: 15 }}>{selectedUser.name || 'Not provided'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Phone Number</div>
                                        <div style={{ fontSize: 15 }}>{selectedUser.phone}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Credentials */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} /> Credentials</div>
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16 }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Registration Type</div>
                                        <div style={{ fontSize: 15 }}>{selectedUser.role}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>ID Number (ARN / GSTIN)</div>
                                        <div style={{ fontSize: 15, color: '#d4af35', fontWeight: 600 }}>{selectedUser.businessId || 'Not provided'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Documents</div>
                                {selectedUser.documents?.length > 0 ? selectedUser.documents.map(doc => (
                                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 8 }}><FileText size={20} color="#d4af35" /></div>
                                        <div>
                                            <div style={{ fontSize: 14 }}>{doc.fileName}</div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{doc.type}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No documents uploaded</div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            {!showRejectInput ? (
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button
                                        onClick={handleApprove}
                                        style={{ flex: 1, background: '#d4af35', color: 'black', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                                    >
                                        <CheckCircle size={18} /> Approve
                                    </button>
                                    <button
                                        onClick={() => setShowRejectInput(true)}
                                        style={{ flex: 1, background: 'transparent', color: '#ff4b4b', border: '1px solid rgba(255, 75, 75, 0.4)', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <textarea
                                        placeholder="Reason for rejection (e.g. Invalid ARN)..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        style={{ width: '100%', height: 80, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,75,75,0.4)', color: 'white', padding: 12, borderRadius: 8, marginBottom: 12, outline: 'none', resize: 'none' }}
                                    />
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            onClick={handleReject}
                                            style={{ flex: 1, background: '#ff4b4b', color: 'white', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Confirm Rejection
                                        </button>
                                        <button
                                            onClick={() => setShowRejectInput(false)}
                                            style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', padding: '10px', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
