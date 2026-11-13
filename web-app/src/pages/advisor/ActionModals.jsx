import React, { useState } from 'react';
import { X, TrendingUp, Send } from 'lucide-react';
import { api } from '../../api';

const CATEGORIES = ['savings', 'investment', 'insurance', 'debt', 'general'];

export default function SendRecommendationModal({ clientId, clientName, onClose, onSent }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('general');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !content.trim()) return;
        setSending(true);
        try {
            await api.sendRecommendation(clientId, title.trim(), content.trim(), category);
            onSent?.();
            onClose();
        } catch (err) {
            console.error('Failed to send recommendation', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={overlay}>
            <div className="glass-card" style={modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                        <TrendingUp size={20} color="var(--accent)" /> Send Recommendation
                    </h3>
                    <button onClick={onClose} style={closeBtn}><X size={18} /></button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                    To: <strong style={{ color: 'var(--text-primary)' }}>{clientName}</strong>
                </p>

                <label style={labelStyle}>Title</label>
                <input
                    className="input"
                    placeholder="e.g. Start a SIP in Nifty 50 Index Fund"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ marginBottom: 12 }}
                />

                <label style={labelStyle}>Category</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(c => (
                        <button
                            key={c}
                            onClick={() => setCategory(c)}
                            style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                                textTransform: 'capitalize',
                                background: category === c ? 'rgba(186,143,13,0.2)' : 'var(--card-bg)',
                                border: `1px solid ${category === c ? 'var(--accent)' : 'var(--card-border)'}`,
                                color: category === c ? 'var(--accent)' : 'var(--text-secondary)',
                                fontWeight: category === c ? 600 : 400,
                            }}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                <label style={labelStyle}>Details</label>
                <textarea
                    className="input"
                    rows="4"
                    placeholder="Explain your recommendation and why it's a good fit..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    style={{ resize: 'none', marginBottom: 16 }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSend}
                        disabled={sending || !title.trim() || !content.trim()}
                    >
                        <Send size={14} /> {sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ScheduleCallModal({ clientId, clientName, onClose, onScheduled }) {
    const [scheduledAt, setScheduledAt] = useState('');
    const [duration, setDuration] = useState(30);
    const [notes, setNotes] = useState('');
    const [sending, setSending] = useState(false);

    const handleSchedule = async () => {
        if (!scheduledAt) return;
        setSending(true);
        try {
            await api.scheduleCall(clientId, scheduledAt, duration, notes.trim() || undefined);
            onScheduled?.();
            onClose();
        } catch (err) {
            console.error('Failed to schedule call', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={overlay}>
            <div className="glass-card" style={modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                        📞 Schedule Call
                    </h3>
                    <button onClick={onClose} style={closeBtn}><X size={18} /></button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                    With: <strong style={{ color: 'var(--text-primary)' }}>{clientName}</strong>
                </p>

                <label style={labelStyle}>Date & Time</label>
                <input
                    type="datetime-local"
                    className="input"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    style={{ marginBottom: 12 }}
                />

                <label style={labelStyle}>Duration</label>
                <select
                    className="input"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    style={{ marginBottom: 12 }}
                >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                </select>

                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                    className="input"
                    rows="3"
                    placeholder="Agenda or topics to discuss..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ resize: 'none', marginBottom: 16 }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSchedule}
                        disabled={sending || !scheduledAt}
                    >
                        {sending ? 'Scheduling...' : 'Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function FlagForReviewModal({ clientId, clientName, onClose, onFlagged }) {
    const [reason, setReason] = useState('');
    const [priority, setPriority] = useState('medium');
    const [sending, setSending] = useState(false);

    const handleFlag = async () => {
        if (!reason.trim()) return;
        setSending(true);
        try {
            await api.flagClient(clientId, reason.trim(), priority);
            onFlagged?.();
            onClose();
        } catch (err) {
            console.error('Failed to flag client', err);
        } finally {
            setSending(false);
        }
    };

    const priorities = [
        { key: 'low', label: 'Low', color: 'var(--info)' },
        { key: 'medium', label: 'Medium', color: 'var(--warning)' },
        { key: 'high', label: 'High', color: 'var(--error)' },
    ];

    return (
        <div style={overlay}>
            <div className="glass-card" style={modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--error)' }}>
                        ⚠️ Flag for Review
                    </h3>
                    <button onClick={onClose} style={closeBtn}><X size={18} /></button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                    Client: <strong style={{ color: 'var(--text-primary)' }}>{clientName}</strong>
                </p>

                <label style={labelStyle}>Priority</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {priorities.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPriority(p.key)}
                            style={{
                                flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                                background: priority === p.key ? `${p.color}20` : 'var(--card-bg)',
                                border: `1px solid ${priority === p.key ? p.color : 'var(--card-border)'}`,
                                color: priority === p.key ? p.color : 'var(--text-secondary)',
                                fontWeight: priority === p.key ? 600 : 400,
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <label style={labelStyle}>Reason</label>
                <textarea
                    className="input"
                    rows="4"
                    placeholder="Describe why this client needs admin review..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{ resize: 'none', marginBottom: 16 }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleFlag}
                        disabled={sending || !reason.trim()}
                        style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
                    >
                        {sending ? 'Flagging...' : 'Flag Client'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Shared styles
const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = { width: 480, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' };
const closeBtn = {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: 4,
};
const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase',
    letterSpacing: '0.5px',
};
