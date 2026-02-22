import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api';
import { Sparkles, Send, Bot, User, BarChart3, Users, AlertTriangle, TrendingUp, MessageSquare, Plus, Edit3, Check, X, Trash2 } from 'lucide-react';

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

export default function CoPilotChat() {
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [cohortStats, setCohortStats] = useState(null);
    const [editingRoomId, setEditingRoomId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const loadRooms = useCallback(async () => {
        setRoomsLoading(true);
        try {
            const data = await api.getChatRooms('COPILOT');
            setRooms(data.rooms || []);
            return data.rooms || [];
        } catch { setRooms([]); return []; }
        finally { setRoomsLoading(false); }
    }, []);

    const loadMessages = useCallback(async (roomId) => {
        if (!roomId) { setMessages([]); return; }
        try {
            // Co-pilot uses the advisors chat endpoint; history isn't directly exposed
            // We'll load from the chatrooms history via the general chat history endpoint
            const data = await api.getChatHistory(roomId);
            setMessages(data.messages || []);
        } catch { setMessages([]); }
    }, []);

    // On mount: load rooms, select latest
    useEffect(() => {
        (async () => {
            const loadedRooms = await loadRooms();
            if (loadedRooms.length > 0) {
                setActiveRoomId(loadedRooms[0].id);
                await loadMessages(loadedRooms[0].id);
            }
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const selectRoom = async (roomId) => {
        if (roomId === activeRoomId) return;
        setActiveRoomId(roomId);
        setMessages([]);
        await loadMessages(roomId);
    };

    const createRoom = async () => {
        try {
            const data = await api.createChatRoom('COPILOT');
            const newRoom = data.room;
            setRooms(prev => [newRoom, ...prev]);
            setActiveRoomId(newRoom.id);
            setMessages([]);
        } catch { }
    };

    const deleteRoom = async (roomId, e) => {
        e.stopPropagation();
        try {
            await api.deleteChatRoom(roomId);
            setRooms(prev => prev.filter(r => r.id !== roomId));
            if (activeRoomId === roomId) {
                const remaining = rooms.filter(r => r.id !== roomId);
                if (remaining.length > 0) {
                    setActiveRoomId(remaining[0].id);
                    await loadMessages(remaining[0].id);
                } else {
                    setActiveRoomId(null);
                    setMessages([]);
                }
            }
        } catch { }
    };

    const startRename = (room, e) => {
        e.stopPropagation();
        setEditingRoomId(room.id);
        setEditTitle(room.title);
    };

    const saveRename = async (e) => {
        e.stopPropagation();
        if (!editTitle.trim()) return;
        try {
            await api.renameChatRoom(editingRoomId, editTitle.trim());
            setRooms(prev => prev.map(r => r.id === editingRoomId ? { ...r, title: editTitle.trim() } : r));
        } catch { }
        setEditingRoomId(null);
    };

    const cancelRename = (e) => {
        e.stopPropagation();
        setEditingRoomId(null);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, id: Date.now() }]);
        setLoading(true);

        try {
            const res = await api.advisorCoPilotChat(userMsg, activeRoomId);
            if (!activeRoomId && res.chatRoomId) {
                setActiveRoomId(res.chatRoomId);
                setTimeout(() => loadRooms(), 1500);
            } else {
                setTimeout(() => loadRooms(), 1500);
            }
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.response,
                id: res.messageId || Date.now() + 1,
            }]);
            if (res.cohortStats) setCohortStats(res.cohortStats);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I ran into an issue. Please try again.',
                id: Date.now() + 1,
            }]);
        }
        setLoading(false);
    };

    const suggestedQueries = [
        'Which clients need immediate attention?',
        'Summarize my portfolio performance',
        'What savings strategies work best for low-income clients?',
        'Draft a financial plan for clients with debt issues',
    ];

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 40px)', gap: 0 }}>
            {/* ── Room Sidebar ── */}
            <div style={{
                width: 280, minWidth: 280, display: 'flex', flexDirection: 'column',
                borderRight: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
            }}>
                <div style={{ padding: '20px 16px 12px' }}>
                    <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Co-Pilot Sessions</h4>
                    <button
                        onClick={createRoom}
                        style={{
                            width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--accent)', border: 'none', color: '#000',
                            fontWeight: 600, fontSize: 13,
                        }}
                    >
                        <Plus size={16} /> New Session
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                    {roomsLoading ? (
                        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Loading...</div>
                    ) : rooms.length === 0 ? (
                        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No sessions yet</div>
                    ) : rooms.map(room => (
                        <div
                            key={room.id}
                            onClick={() => selectRoom(room.id)}
                            style={{
                                padding: '10px 12px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                                background: activeRoomId === room.id ? 'rgba(186,143,13,0.12)' : 'transparent',
                                border: `1px solid ${activeRoomId === room.id ? 'rgba(186,143,13,0.3)' : 'transparent'}`,
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = 'transparent'; }}
                        >
                            {editingRoomId === room.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveRename(e); if (e.key === 'Escape') cancelRename(e); }}
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            flex: 1, padding: '4px 8px', borderRadius: 6, fontSize: 13,
                                            background: 'var(--card-bg)', border: '1px solid var(--accent)',
                                            color: 'var(--text-primary)', outline: 'none',
                                        }}
                                    />
                                    <button onClick={saveRename} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                        <Check size={14} color="var(--accent)" />
                                    </button>
                                    <button onClick={cancelRename} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                        <X size={14} color="var(--text-muted)" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{
                                            fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                        }}>
                                            <MessageSquare size={12} style={{ marginRight: 6, opacity: 0.5 }} />
                                            {room.title || 'New Session'}
                                        </div>
                                        <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 4 }}>
                                            <button
                                                onClick={(e) => startRename(room, e)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4 }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
                                            >
                                                <Edit3 size={12} color="var(--text-muted)" />
                                            </button>
                                            <button
                                                onClick={(e) => deleteRoom(room.id, e)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4 }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
                                            >
                                                <Trash2 size={12} color="var(--text-muted)" />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                        <span style={{
                                            fontSize: 11, color: 'var(--text-muted)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                        }}>
                                            {(typeof room.lastMessage === 'object' ? room.lastMessage?.content : room.lastMessage) || `${room._count?.messages || 0} messages`}
                                        </span>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                                            {timeAgo(room.updatedAt)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Main Chat + Stats ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={22} color="var(--accent)" /> AI Co-Pilot
                        </h2>
                        <p style={{ color: 'var(--text-muted)' }}>Your AI assistant powered by your client portfolio data</p>
                    </div>
                </header>

                <div style={{ display: 'flex', flex: 1, gap: 20, overflow: 'hidden' }}>
                    {/* Chat Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            flex: 1, overflowY: 'auto', padding: '0 16px',
                            display: 'flex', flexDirection: 'column', gap: 12,
                        }}>
                            {messages.length === 0 && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    flex: 1, color: 'var(--text-muted)', gap: 16, padding: '0 20px',
                                }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(186,143,13,0.1), rgba(186,143,13,0.2))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 8, boxShadow: '0 0 30px rgba(186, 143, 13, 0.1)'
                                    }}>
                                        <Sparkles size={40} color="var(--accent)" />
                                    </div>
                                    <h3 style={{ fontSize: 24, color: 'var(--text-primary)', fontWeight: 600, margin: 0, letterSpacing: '-0.5px' }}>Ask your AI Co-Pilot</h3>
                                    <p style={{ fontSize: 15, maxWidth: 420, textAlign: 'center', lineHeight: 1.5 }}>
                                        Get instant insights about your clients, portfolio performance, and personalized financial strategies.
                                    </p>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, maxWidth: 700 }}>
                                        {suggestedQueries.map(q => (
                                            <button
                                                key={q}
                                                style={{
                                                    padding: '10px 18px',
                                                    cursor: 'pointer',
                                                    fontSize: 13,
                                                    border: '1px solid var(--card-border)',
                                                    borderRadius: 20,
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: 'var(--text-secondary)',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(186, 143, 13, 0.15)';
                                                    e.currentTarget.style.color = 'var(--text-primary)';
                                                    e.currentTarget.style.borderColor = 'rgba(186, 143, 13, 0.4)';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                                    e.currentTarget.style.borderColor = 'var(--card-border)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                                onClick={() => setInput(q)}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    style={{
                                        display: 'flex', gap: 10,
                                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                    }}
                                >
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        background: msg.role === 'user' ? 'var(--accent)' : 'rgba(186,143,13,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        {msg.role === 'user' ? <User size={16} color="#000" /> : <Sparkles size={16} color="var(--accent)" />}
                                    </div>
                                    <div style={{
                                        maxWidth: '75%', padding: '14px 18px', borderRadius: 18,
                                        background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'var(--card-bg)',
                                        color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
                                        border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
                                        boxShadow: msg.role === 'user' ? '0 4px 12px rgba(186, 143, 13, 0.2)' : 'var(--shadow-card)',
                                        fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        background: 'rgba(186,143,13,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Sparkles size={16} color="var(--accent)" />
                                    </div>
                                    <div className="glass-card" style={{ padding: '12px 16px', fontSize: 14 }}>
                                        <span className="typing-dots">Analyzing your portfolio...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{
                            display: 'flex', gap: 12, padding: '20px',
                            borderTop: '1px solid var(--card-border)',
                            background: 'var(--bg-secondary)',
                            alignItems: 'center'
                        }}>
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                placeholder="Ask about your clients, strategies, or portfolio..."
                                style={{
                                    flex: 1, padding: '12px 16px', borderRadius: 14,
                                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                                }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                style={{
                                    padding: '12px 20px', borderRadius: 14,
                                    background: input.trim() ? 'var(--accent)' : 'rgba(186,143,13,0.2)',
                                    border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    color: input.trim() ? '#000' : 'var(--text-muted)', fontWeight: 600,
                                }}
                            >
                                <Send size={16} /> Send
                            </button>
                        </div>
                    </div>

                    {/* Cohort Stats Sidebar */}
                    {cohortStats && (
                        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '0 12px 0 0' }}>
                            <div className="glass-card" style={{ padding: 16 }}>
                                <h4 className="section-title" style={{ fontSize: 13 }}>Portfolio Snapshot</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Users size={14} /> Total Clients
                                        </span>
                                        <span style={{ fontWeight: 600 }}>{cohortStats.totalClients || '\u2014'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <BarChart3 size={14} /> Avg Health
                                        </span>
                                        <span style={{ fontWeight: 600 }}>{cohortStats.avgHealthScore || '\u2014'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <AlertTriangle size={14} /> At Risk
                                        </span>
                                        <span style={{ fontWeight: 600, color: 'var(--error)' }}>{cohortStats.atRiskCount || '\u2014'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <TrendingUp size={14} /> Avg Income
                                        </span>
                                        <span style={{ fontWeight: 600 }}>\u20B9{cohortStats.avgIncome ? Math.round(cohortStats.avgIncome).toLocaleString() : '\u2014'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
