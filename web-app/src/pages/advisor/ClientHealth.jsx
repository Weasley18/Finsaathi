import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, Calendar, Shield, TrendingUp,
    Target, AlertTriangle, Save, MessageSquare, Bell, Check
} from 'lucide-react';
import { api } from '../../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import SendRecommendationModal, { ScheduleCallModal, FlagForReviewModal } from './ActionModals';

// Specific components for this page

const HealthRing = ({ score }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    let color = 'var(--error)';
    if (score >= 70) color = 'var(--success)';
    else if (score >= 40) color = 'var(--bright-gold)'; // Yellowish

    return (
        <div className="health-ring" style={{ width: 120, height: 120, position: 'relative', border: 'none' }}>
            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                <circle
                    cx="60" cy="60" r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div className="score" style={{ color: color }}>{score}</div>
                <div className="label">Health Score</div>
            </div>
        </div>
    );
};

const ProgressBar = ({ label, value, color }) => (
    <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{value}%</span>
        </div>
        <div className="progress-bar">
            <div
                className="progress-bar-fill"
                style={{ width: `${value}%`, background: color }}
            />
        </div>
    </div>
);

const GoalCard = ({ name, current, target, icon }) => {
    const percent = Math.min(100, Math.round((current / target) * 100));
    return (
        <div className="glass-card-flat" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                ₹{current / 1000}k / ₹{target / 1000}k
            </div>
            <div className="progress-bar" style={{ height: 4 }}>
                <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
};

export default function ClientHealth() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [notesList, setNotesList] = useState([]);
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);
    const [showRecModal, setShowRecModal] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);
    const [showFlagModal, setShowFlagModal] = useState(false);

    // Mock data for charts
    const trendData = [
        { month: 'Jan', income: 12000, expense: 8000 },
        { month: 'Feb', income: 12500, expense: 9500 },
        { month: 'Mar', income: 12000, expense: 7800 },
        { month: 'Apr', income: 13000, expense: 11000 },
        { month: 'May', income: 15000, expense: 9000 },
        { month: 'Jun', income: 14500, expense: 8500 }, // Current
    ];

    useEffect(() => {
        loadClientData();
    }, [id]);

    const loadClientData = async () => {
        try {
            const res = await api.getUserById(id);
            setClient(res.user);
        } catch (err) {
            console.error("Failed to load client", err);
        } finally {
            setLoading(false);
        }
    };

    const loadNotes = async () => {
        try {
            const res = await api.getAdvisorNotes(id);
            setNotesList(res.notes || []);
        } catch (err) { console.error('Failed to load notes', err); }
    };

    useEffect(() => { loadNotes(); }, [id]);

    const saveNotes = async () => {
        if (!notes.trim()) return;
        setSavingNotes(true);
        try {
            await api.createAdvisorNote(id, notes.trim());
            setNotes('');
            setNotesSaved(true);
            setTimeout(() => setNotesSaved(false), 2000);
            loadNotes();
        } catch (err) {
            console.error('Failed to save notes', err);
        } finally {
            setSavingNotes(false);
        }
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;
    if (!client) return <div style={{ padding: 40 }}>Client not found</div>;

    const healthScore = client.financialProfile?.healthScore || 65; // Fallback mock

    return (
        <div style={{ paddingBottom: 80 }}> {/* Padding for fixed bottom bar if needed */}

            {/* ─── Header ─── */}
            <div className="glass-card" style={{ marginBottom: 24 }}>
                <button onClick={() => navigate('/advisor')} className="btn" style={{ padding: '0 0 16px 0', color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), var(--bright-gold))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 32, fontWeight: 700, color: '#000'
                    }}>
                        {client.name[0]}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                            <h2 style={{ fontSize: 24, margin: 0 }}>{client.name}</h2>
                            <span className="badge badge-gold">Free Tier</span>
                        </div>
                        <div style={{ display: 'flex', gap: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Phone size={14} /> {client.phone}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} /> Member since Mar 2024
                            </div>
                        </div>
                    </div>

                    <HealthRing score={healthScore} />
                </div>
            </div>

            <div className="two-col-grid">

                {/* ─── Financial Health Breakdown ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Health Breakdown</h3>
                    <ProgressBar label="Savings Rate" value={45} color="var(--warning)" />
                    <ProgressBar label="Spending Discipline" value={72} color="var(--success)" />
                    <ProgressBar label="Goal Progress" value={55} color="var(--accent)" />
                    <ProgressBar label="Budget Adherence" value={80} color="var(--success)" />
                    <ProgressBar label="Emergency Fund" value={30} color="var(--error)" />
                </div>

                {/* ─── Monthly Trends Chart ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Income vs Expenses</h3>
                    <div style={{ height: 200, width: '100%' }}>
                        <ResponsiveContainer>
                            <LineChart data={trendData}>
                                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => `₹${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Line type="monotone" dataKey="income" stroke="var(--accent-light)" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="expense" stroke="var(--success)" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* ─── Active Goals ─── */}
            <h3 className="section-title">Active Goals</h3>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <GoalCard name="Emergency Fund" current={25000} target={100000} icon="🛡️" />
                <GoalCard name="Wedding Savings" current={200000} target={500000} icon="💍" />
                <GoalCard name="New Bike" current={30000} target={80000} icon="🏍️" />
            </div>

            <div className="two-col-grid" style={{ marginTop: 24 }}>
                {/* ─── Advisor Notes ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Advisor Notes</h3>
                    <textarea
                        className="input"
                        rows="3"
                        placeholder="Add private notes about this client..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ resize: 'none', marginBottom: 12 }}
                    />
                    <div style={{ textAlign: 'right' }}>
                        <button className="btn btn-primary" onClick={saveNotes} disabled={savingNotes || !notes.trim()}>
                            {notesSaved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> {savingNotes ? 'Saving...' : 'Save Notes'}</>}
                        </button>
                    </div>
                    {notesList.length > 0 && (
                        <div style={{ marginTop: 16, borderTop: '1px solid var(--card-border)', paddingTop: 12 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Previous Notes</div>
                            {notesList.slice(0, 5).map((n, i) => (
                                <div key={i} style={{
                                    padding: '8px 12px', marginBottom: 6, borderRadius: 8,
                                    background: 'rgba(186,143,13,0.05)', fontSize: 13,
                                    borderLeft: '2px solid var(--accent)',
                                }}>
                                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.note || n.content}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Quick Actions ─── */}
                <div className="glass-card">
                    <h3 className="section-title">Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => setShowRecModal(true)}>
                            <TrendingUp size={16} /> Send Recommendation
                        </button>
                        <button className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={() => setShowCallModal(true)}>
                            <Phone size={16} /> Schedule Call
                        </button>
                        <button className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={() => navigate('/advisor/messages', { state: { clientId: id, clientName: client.name } })}>
                            <MessageSquare size={16} /> Chat
                        </button>
                        <button className="btn btn-secondary" style={{ justifyContent: 'center', color: 'var(--error)', borderColor: 'rgba(231,76,60,0.3)' }} onClick={() => setShowFlagModal(true)}>
                            <AlertTriangle size={16} /> Flag for Review
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Modals ─── */}
            {showRecModal && (
                <SendRecommendationModal clientId={id} clientName={client.name} onClose={() => setShowRecModal(false)} />
            )}
            {showCallModal && (
                <ScheduleCallModal clientId={id} clientName={client.name} onClose={() => setShowCallModal(false)} />
            )}
            {showFlagModal && (
                <FlagForReviewModal clientId={id} clientName={client.name} onClose={() => setShowFlagModal(false)} />
            )}

        </div>
    );
}
