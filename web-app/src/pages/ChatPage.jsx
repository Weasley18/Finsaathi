import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { MessageSquare, Send, Sparkles, Bot, User, Trash2, UserCheck, Plus, Edit3, Check, X, Volume2, Clock, Hash, ChevronRight } from 'lucide-react';

const MODES = [
    { key: 'ai', label: 'FinSaathi AI', icon: Sparkles, type: 'AI_CHAT', desc: 'Your multilingual financial advisor' },
    { key: 'clone', label: 'Advisor Clone', icon: UserCheck, type: 'ADVISOR_CLONE', desc: 'Talk to your advisor\'s AI clone' },
];

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatMessageContent(text) {
    if (!text) return text;
    // Convert **bold** to <strong>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Convert bullet points
    html = html.replace(/^[•\-] (.+)$/gm, '<span style="display:flex;gap:8px;margin:2px 0"><span style="color:var(--accent)">•</span><span>$1</span></span>');
    // Convert numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<span style="display:flex;gap:8px;margin:2px 0"><span style="color:var(--accent);font-weight:600;min-width:18px">$1.</span><span>$1</span></span>');
    return html;
}

export default function ChatPage() {
    const { t, i18n } = useTranslation();
    const [mode, setMode] = useState('ai');
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [editingRoomId, setEditingRoomId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [hoveredRoom, setHoveredRoom] = useState(null);
    const [speakingId, setSpeakingId] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const currentMode = MODES.find(m => m.key === mode);
    const currentType = currentMode?.type;
    const activeRoom = rooms.find(r => r.id === activeRoomId);

    // Load rooms when mode changes
    const loadRooms = useCallback(async (type) => {
        setRoomsLoading(true);
        try {
            const data = await api.getChatRooms(type);
            setRooms(data.rooms || []);
            return data.rooms || [];
        } catch { setRooms([]); return []; }
        finally { setRoomsLoading(false); }
    }, []);

    // Load messages for a room
    const loadMessages = useCallback(async (roomId) => {
        if (!roomId) { setMessages([]); return; }
        try {
            const data = await api.getChatHistory(roomId);
            setMessages(data.messages || []);
        } catch { setMessages([]); }
    }, []);

    useEffect(() => {
        (async () => {
            const loadedRooms = await loadRooms(currentType);
            if (loadedRooms.length > 0) {
                setActiveRoomId(loadedRooms[0].id);
                await loadMessages(loadedRooms[0].id);
            } else {
                setActiveRoomId(null);
                setMessages([]);
            }
        })();
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const selectRoom = async (roomId) => {
        if (roomId === activeRoomId) return;
        setActiveRoomId(roomId);
        setMessages([]);
        await loadMessages(roomId);
        inputRef.current?.focus();
    };

    const createRoom = async () => {
        try {
            const data = await api.createChatRoom(currentType);
            const newRoom = data.room;
            setRooms(prev => [newRoom, ...prev]);
            setActiveRoomId(newRoom.id);
            setMessages([]);
            inputRef.current?.focus();
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
            let res;
            if (mode === 'clone') {
                res = await api.advisorCloneChat(userMsg, activeRoomId);
            } else {
                res = await api.sendChatMessage(userMsg, activeRoomId);
            }

            if (!activeRoomId && res.chatRoomId) {
                setActiveRoomId(res.chatRoomId);
            }
            // Refresh rooms to get updated title/preview
            setTimeout(() => loadRooms(currentType), 1500);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.response,
                id: res.messageId || Date.now() + 1,
                toolsUsed: res.toolsUsed,
                detectedLanguage: res.detectedLanguage,
                isClone: mode === 'clone',
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I ran into an issue. Please try again!',
                id: Date.now() + 1,
                isError: true,
            }]);
        }
        setLoading(false);
        inputRef.current?.focus();
    };

    const handleSpeak = (text, msgId) => {
        if (!window.speechSynthesis) return;
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setSpeakingId(null);
            return;
        }
        const cleanText = text.replace(/[*_~`#]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const ttsLangMap = {
            en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
            bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
            ml: 'ml-IN', pa: 'pa-IN', or: 'or-IN', as: 'as-IN',
        };
        utterance.lang = ttsLangMap[i18n.language] || 'en-IN';
        utterance.rate = 1.0;
        utterance.onend = () => setSpeakingId(null);
        setSpeakingId(msgId);
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        return () => { window.speechSynthesis?.cancel(); };
    }, []);

    const quickActions = mode === 'clone'
        ? ['What SIP do you recommend?', 'Should I invest in gold?', 'How to build emergency fund?', 'Review my portfolio']
        : ['How is my financial health?', 'मेरा बजट कितना है?', 'Suggest a SIP plan', 'Which govt schemes can I use?'];

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 40px)' }}>
            {/* ── Sidebar ── */}
            <div style={{
                width: 300, minWidth: 300, display: 'flex', flexDirection: 'column',
                borderRight: '1px solid var(--card-border)',
                background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            }}>
                {/* Mode Toggle */}
                <div style={{ padding: '16px 16px 12px' }}>
                    <div style={{
                        display: 'flex', gap: 4, padding: 4,
                        background: 'rgba(0,0,0,0.3)', borderRadius: 14,
                    }}>
                        {MODES.map(m => (
                            <button
                                key={m.key}
                                onClick={() => setMode(m.key)}
                                style={{
                                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    background: mode === m.key
                                        ? 'linear-gradient(135deg, rgba(186,143,13,0.2), rgba(186,143,13,0.1))'
                                        : 'transparent',
                                    border: mode === m.key ? '1px solid rgba(186,143,13,0.3)' : '1px solid transparent',
                                    color: mode === m.key ? 'var(--accent-light)' : 'var(--text-muted)',
                                    fontWeight: mode === m.key ? 600 : 400, fontSize: 12.5,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <m.icon size={14} /> {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* New Chat Button */}
                <div style={{ padding: '0 16px 12px' }}>
                    <button
                        onClick={createRoom}
                        style={{
                            width: '100%', padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'linear-gradient(135deg, var(--accent) 0%, #D4AF37 100%)',
                            border: 'none', color: '#000',
                            fontWeight: 600, fontSize: 13.5,
                            boxShadow: '0 2px 12px rgba(186,143,13,0.25)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(186,143,13,0.35)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(186,143,13,0.25)'; }}
                    >
                        <Plus size={16} strokeWidth={2.5} /> New Chat
                    </button>
                </div>

                {/* Divider */}
                <div style={{ margin: '0 16px', borderTop: '1px solid var(--divider)' }} />

                {/* Room List */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '8px 10px',
                    scrollbarWidth: 'thin', scrollbarColor: 'rgba(186,143,13,0.15) transparent',
                }}>
                    {roomsLoading ? (
                        <div style={{ padding: 32, textAlign: 'center' }}>
                            <div style={{
                                width: 32, height: 32, margin: '0 auto 12px',
                                border: '2px solid var(--card-border)', borderTopColor: 'var(--accent)',
                                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                            }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading conversations...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                            <MessageSquare size={36} color="var(--text-muted)" strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                                No conversations yet.<br />Start a new chat to begin!
                            </p>
                        </div>
                    ) : rooms.map(room => {
                        const isActive = activeRoomId === room.id;
                        const isHovered = hoveredRoom === room.id;
                        return (
                            <div
                                key={room.id}
                                onClick={() => selectRoom(room.id)}
                                onMouseEnter={() => setHoveredRoom(room.id)}
                                onMouseLeave={() => setHoveredRoom(null)}
                                style={{
                                    padding: '12px 14px', borderRadius: 12, marginBottom: 4, cursor: 'pointer',
                                    background: isActive
                                        ? 'linear-gradient(135deg, rgba(186,143,13,0.12), rgba(186,143,13,0.06))'
                                        : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                                    border: `1px solid ${isActive ? 'rgba(186,143,13,0.25)' : 'transparent'}`,
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                }}
                            >
                                {isActive && (
                                    <div style={{
                                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                                        width: 3, height: 20, borderRadius: '0 4px 4px 0',
                                        background: 'var(--accent)',
                                    }} />
                                )}
                                {editingRoomId === room.id ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') saveRename(e); if (e.key === 'Escape') cancelRename(e); }}
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13,
                                                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--accent)',
                                                color: 'var(--text-primary)', outline: 'none',
                                            }}
                                        />
                                        <button onClick={saveRename} style={{
                                            background: 'rgba(186,143,13,0.15)', border: 'none', cursor: 'pointer',
                                            padding: 5, borderRadius: 6, display: 'flex',
                                        }}>
                                            <Check size={13} color="var(--accent)" />
                                        </button>
                                        <button onClick={cancelRename} style={{
                                            background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer',
                                            padding: 5, borderRadius: 6, display: 'flex',
                                        }}>
                                            <X size={13} color="var(--text-muted)" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                            }}>
                                                {room.title || 'New Chat'}
                                            </span>
                                            <div style={{
                                                display: 'flex', gap: 2, flexShrink: 0,
                                                opacity: isHovered || isActive ? 1 : 0, transition: 'opacity 0.15s',
                                            }}>
                                                <button
                                                    onClick={(e) => startRename(room, e)}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.05)', border: 'none',
                                                        cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,143,13,0.15)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                >
                                                    <Edit3 size={12} color="var(--text-secondary)" />
                                                </button>
                                                <button
                                                    onClick={(e) => deleteRoom(room.id, e)}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.05)', border: 'none',
                                                        cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(231,76,60,0.15)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                >
                                                    <Trash2 size={12} color="var(--text-secondary)" />
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 }}>
                                            <span style={{
                                                fontSize: 12, color: 'var(--text-muted)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                                lineHeight: 1.3,
                                            }}>
                                                {(typeof room.lastMessage === 'object' ? room.lastMessage?.content : room.lastMessage) || `${room._count?.messages || 0} messages`}
                                            </span>
                                            <span style={{
                                                fontSize: 11, color: 'var(--text-muted)', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', gap: 3,
                                            }}>
                                                <Clock size={10} strokeWidth={1.5} />
                                                {timeAgo(room.updatedAt)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar Footer */}
                <div style={{
                    padding: '12px 16px', borderTop: '1px solid var(--divider)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Hash size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {rooms.length} conversation{rooms.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* ── Main Chat Area ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-primary)' }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--card-border)',
                    background: 'linear-gradient(180deg, rgba(26,13,0,0.6) 0%, transparent 100%)',
                    backdropFilter: 'blur(10px)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(186,143,13,0.2), rgba(186,143,13,0.08))',
                            border: '1px solid rgba(186,143,13,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {mode === 'clone'
                                ? <UserCheck size={20} color="var(--accent)" />
                                : <Sparkles size={20} color="var(--accent)" />
                            }
                        </div>
                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                                {activeRoom?.title || currentMode?.label}
                            </h2>
                            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                                {currentMode?.desc} • Supports Hindi, Tamil, Telugu & more
                            </p>
                        </div>
                    </div>
                    {activeRoom && (
                        <div style={{
                            padding: '5px 12px', borderRadius: 20,
                            background: 'rgba(186,143,13,0.08)', border: '1px solid rgba(186,143,13,0.12)',
                            fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <MessageSquare size={12} />
                            {messages.length} messages
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px 24px',
                    display: 'flex', flexDirection: 'column', gap: 16,
                    scrollbarWidth: 'thin', scrollbarColor: 'rgba(186,143,13,0.1) transparent',
                }}>
                    {messages.length === 0 && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            flex: 1, gap: 20, padding: '40px 20px',
                        }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: 28,
                                background: 'linear-gradient(135deg, rgba(186,143,13,0.12), rgba(186,143,13,0.04))',
                                border: '1px solid rgba(186,143,13,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Bot size={36} color="var(--accent)" strokeWidth={1.2} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                                    {mode === 'clone' ? 'Talk to Your Advisor\'s AI Clone' : 'Ask me anything about your finances!'}
                                </h3>
                                <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.5 }}>
                                    {mode === 'clone'
                                        ? 'Get personalized advice based on your advisor\'s expertise and knowledge.'
                                        : 'I can help with budgeting, investments, savings goals, and more.'}
                                </p>
                            </div>
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 480, width: '100%',
                            }}>
                                {quickActions.map(q => (
                                    <button
                                        key={q}
                                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                        style={{
                                            padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                                            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4,
                                            background: 'rgba(26,13,0,0.5)',
                                            border: '1px solid var(--card-border)', borderRadius: 14,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = 'rgba(186,143,13,0.3)';
                                            e.currentTarget.style.background = 'rgba(186,143,13,0.06)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = 'var(--card-border)';
                                            e.currentTarget.style.background = 'rgba(26,13,0,0.5)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        <span>{q}</span>
                                        <ChevronRight size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            style={{
                                display: 'flex', gap: 12,
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                maxWidth: '100%',
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                                background: msg.role === 'user'
                                    ? 'linear-gradient(135deg, var(--accent), #D4AF37)'
                                    : 'linear-gradient(135deg, rgba(186,143,13,0.15), rgba(186,143,13,0.05))',
                                border: msg.role === 'user' ? 'none' : '1px solid rgba(186,143,13,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: msg.role === 'user' ? '0 2px 8px rgba(186,143,13,0.3)' : 'none',
                            }}>
                                {msg.role === 'user'
                                    ? <User size={16} color="#000" strokeWidth={2.2} />
                                    : <Bot size={16} color="var(--accent)" />
                                }
                            </div>

                            {/* Bubble */}
                            <div style={{
                                maxWidth: '72%', minWidth: 0,
                            }}>
                                {/* Sender label */}
                                <div style={{
                                    fontSize: 11.5, fontWeight: 600, marginBottom: 4,
                                    color: msg.role === 'user' ? 'var(--text-muted)' : 'var(--accent)',
                                    textAlign: msg.role === 'user' ? 'right' : 'left',
                                }}>
                                    {msg.role === 'user' ? 'You' : (mode === 'clone' ? 'Advisor Clone' : 'FinSaathi AI')}
                                </div>

                                <div style={{
                                    padding: '14px 18px', borderRadius: 18,
                                    borderTopRightRadius: msg.role === 'user' ? 4 : 18,
                                    borderTopLeftRadius: msg.role === 'user' ? 18 : 4,
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, var(--accent), #c99e15)'
                                        : msg.isError
                                            ? 'rgba(231,76,60,0.1)'
                                            : 'var(--card-bg)',
                                    color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
                                    border: msg.role === 'user'
                                        ? 'none'
                                        : msg.isError
                                            ? '1px solid rgba(231,76,60,0.2)'
                                            : '1px solid var(--card-border)',
                                    fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    boxShadow: msg.role === 'user'
                                        ? '0 2px 12px rgba(186,143,13,0.2)'
                                        : '0 1px 4px rgba(0,0,0,0.2)',
                                }}>
                                    {msg.content}
                                </div>

                                {/* Meta info for assistant messages */}
                                {msg.role === 'assistant' && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        marginTop: 6, flexWrap: 'wrap',
                                    }}>
                                        {/* Tools Used Badges */}
                                        {msg.toolsUsed?.length > 0 && (
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {msg.toolsUsed.map(tl => (
                                                    <span key={tl} style={{
                                                        padding: '2px 8px', borderRadius: 8, fontSize: 11,
                                                        background: 'rgba(186,143,13,0.08)',
                                                        border: '1px solid rgba(186,143,13,0.12)',
                                                        color: 'var(--accent)',
                                                    }}>{tl}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Language badge */}
                                        {msg.detectedLanguage && msg.detectedLanguage !== 'en' && (
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 8, fontSize: 11,
                                                background: 'rgba(84,160,255,0.08)',
                                                border: '1px solid rgba(84,160,255,0.15)',
                                                color: 'var(--info)',
                                            }}>
                                                {msg.detectedLanguage.toUpperCase()}
                                            </span>
                                        )}

                                        {/* TTS Button */}
                                        <button
                                            onClick={() => handleSpeak(msg.content, msg.id)}
                                            style={{
                                                background: speakingId === msg.id ? 'rgba(186,143,13,0.15)' : 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: 8, padding: '3px 8px',
                                                color: speakingId === msg.id ? 'var(--accent)' : 'var(--text-muted)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,143,13,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = speakingId === msg.id ? 'rgba(186,143,13,0.15)' : 'rgba(255,255,255,0.04)'}
                                            title="Read Aloud"
                                        >
                                            <Volume2 size={12} />
                                            {speakingId === msg.id ? 'Stop' : 'Listen'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                                background: 'linear-gradient(135deg, rgba(186,143,13,0.15), rgba(186,143,13,0.05))',
                                border: '1px solid rgba(186,143,13,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Bot size={16} color="var(--accent)" />
                            </div>
                            <div>
                                <div style={{
                                    fontSize: 11.5, fontWeight: 600, marginBottom: 4,
                                    color: 'var(--accent)',
                                }}>
                                    {mode === 'clone' ? 'Advisor Clone' : 'FinSaathi AI'}
                                </div>
                                <div style={{
                                    padding: '14px 18px', borderRadius: 18, borderTopLeftRadius: 4,
                                    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                                    fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {[0, 1, 2].map(i => (
                                            <div key={i} style={{
                                                width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                                                animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                                            }} />
                                        ))}
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('chat.thinking')}</span>
                                    <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }`}</style>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div style={{
                    padding: '16px 24px 20px',
                    borderTop: '1px solid var(--card-border)',
                    background: 'linear-gradient(0deg, rgba(26,13,0,0.4) 0%, transparent 100%)',
                }}>
                    <div style={{
                        display: 'flex', gap: 10, alignItems: 'flex-end',
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        borderRadius: 18, padding: '6px 6px 6px 18px',
                        transition: 'border-color 0.2s',
                        ...(input.trim() ? { borderColor: 'rgba(186,143,13,0.3)' } : {}),
                    }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder={t('chat.placeholder')}
                            style={{
                                flex: 1, padding: '10px 0', border: 'none',
                                background: 'transparent', color: 'var(--text-primary)',
                                fontSize: 14.5, outline: 'none', lineHeight: 1.5,
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            style={{
                                padding: '10px 18px', borderRadius: 14,
                                background: input.trim()
                                    ? 'linear-gradient(135deg, var(--accent), #D4AF37)'
                                    : 'rgba(186,143,13,0.12)',
                                border: 'none',
                                cursor: input.trim() ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', gap: 6,
                                color: input.trim() ? '#000' : 'var(--text-muted)',
                                fontWeight: 600, fontSize: 13.5,
                                transition: 'all 0.15s',
                                boxShadow: input.trim() ? '0 2px 8px rgba(186,143,13,0.25)' : 'none',
                            }}
                        >
                            <Send size={15} /> {t('chat.send')}
                        </button>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, opacity: 0.6 }}>
                        AI-powered financial advice • Not a substitute for professional consultation
                    </p>
                </div>
            </div>
        </div>
    );
}
