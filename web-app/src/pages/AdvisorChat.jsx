import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import { MessageSquare, Send, User, Circle, ArrowUp, Clock, CheckCheck, Check, Shield } from 'lucide-react';

function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdvisorChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [advisor, setAdvisor] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const pollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        loadConversations();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    useEffect(() => {
        if (advisor) {
            pollRef.current = setInterval(() => {
                loadMessages(advisor.id, true);
            }, 5000);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [advisor]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const loadConversations = async () => {
        try {
            const res = await api.getConversations();
            const convs = res.conversations || [];
            if (convs.length > 0) {
                const advisorConv = convs.find(c => c.partner?.role === 'ADVISOR') || convs[0];
                setAdvisor(advisorConv.partner);
                loadMessages(advisorConv.partner.id);
            }
        } catch (err) {
            console.error('Failed to load conversations', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (advisorId, silent = false) => {
        try {
            const res = await api.getConversation(advisorId, 100);
            setMessages(res.messages || []);
            setTotalCount(res.totalCount || res.messages?.length || 0);
            setHasMore(res.hasMore || false);
            if (!silent && res.partner) setAdvisor(res.partner);
        } catch (err) {
            if (!silent) console.error('Failed to load messages', err);
        }
    };

    const loadOlderMessages = async () => {
        if (loadingOlder || !hasMore || !advisor) return;
        setLoadingOlder(true);
        const container = messagesContainerRef.current;
        const scrollHeightBefore = container?.scrollHeight || 0;
        try {
            const res = await api.getConversation(advisor.id, 100, messages.length);
            const older = res.messages || [];
            if (older.length > 0) {
                setMessages(prev => [...older, ...prev]);
                setHasMore(res.hasMore || false);
                // Maintain scroll position
                requestAnimationFrame(() => {
                    if (container) {
                        const scrollHeightAfter = container.scrollHeight;
                        container.scrollTop = scrollHeightAfter - scrollHeightBefore;
                    }
                });
            } else {
                setHasMore(false);
            }
        } catch { }
        setLoadingOlder(false);
    };

    const sendMessage = async () => {
        if (!input.trim() || sending || !advisor) return;
        const content = input.trim();
        setInput('');
        setSending(true);

        const tempMsg = {
            id: 'temp-' + Date.now(),
            senderId: 'me',
            content,
            createdAt: new Date().toISOString(),
            sender: { id: 'me', name: 'You' },
            isRead: false,
            isPending: true,
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await api.sendDirectMessage(advisor.id, content);
            await loadMessages(advisor.id, true);
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        }
        setSending(false);
        inputRef.current?.focus();
    };

    // Group messages by date for separators
    const getDateKey = (dateStr) => new Date(dateStr).toDateString();

    if (loading) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: 'calc(100vh - 80px)', gap: 12,
            }}>
                <div style={{
                    width: 36, height: 36, border: '2px solid var(--card-border)',
                    borderTopColor: 'var(--accent)', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading conversations...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!advisor) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: 'calc(100vh - 80px)', gap: 16,
                padding: 40,
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: 28,
                    background: 'linear-gradient(135deg, rgba(186,143,13,0.12), rgba(186,143,13,0.04))',
                    border: '1px solid rgba(186,143,13,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <MessageSquare size={36} color="var(--accent)" strokeWidth={1.2} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    No Advisor Assigned Yet
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
                    Once a financial advisor is assigned to your account, you'll be able to chat with them here for personalized guidance.
                </p>
            </div>
        );
    }

    // Build messages with date separators
    let lastDateKey = null;
    const enrichedMessages = [];
    for (const msg of messages) {
        const dateKey = getDateKey(msg.createdAt);
        if (dateKey !== lastDateKey) {
            enrichedMessages.push({ type: 'date-sep', key: dateKey, date: msg.createdAt });
            lastDateKey = dateKey;
        }
        enrichedMessages.push({ type: 'msg', ...msg });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid var(--card-border)',
                background: 'linear-gradient(180deg, rgba(26,13,0,0.6) 0%, transparent 100%)',
                backdropFilter: 'blur(10px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 16,
                        background: 'linear-gradient(135deg, var(--accent), var(--bright-gold))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontWeight: 700, fontSize: 18, position: 'relative',
                        boxShadow: '0 2px 12px rgba(186,143,13,0.3)',
                    }}>
                        {advisor.avatarUrl ? (
                            <img src={advisor.avatarUrl} alt={advisor.name} style={{
                                width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover',
                            }} />
                        ) : (
                            (advisor.name || '?')[0].toUpperCase()
                        )}
                        <div style={{
                            position: 'absolute', bottom: -1, right: -1,
                            width: 14, height: 14, borderRadius: '50%',
                            background: advisor.isActive ? 'var(--success)' : 'var(--text-muted)',
                            border: '2px solid var(--bg-primary)',
                        }} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>
                            {advisor.name}
                        </h3>
                        <div style={{
                            fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6,
                            color: advisor.isActive ? 'var(--success)' : 'var(--text-muted)',
                        }}>
                            <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: advisor.isActive ? 'var(--success)' : 'var(--text-muted)',
                            }} />
                            {advisor.isActive ? 'Online' : 'Offline'} · Financial Advisor
                        </div>
                    </div>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{
                        padding: '6px 14px', borderRadius: 20,
                        background: 'rgba(186,143,13,0.08)', border: '1px solid rgba(186,143,13,0.12)',
                        fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        <Clock size={12} />
                        {totalCount} message{totalCount !== 1 ? 's' : ''} in history
                    </div>
                    <div style={{
                        padding: '6px 14px', borderRadius: 20,
                        background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.12)',
                        fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        <Shield size={12} />
                        Encrypted
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                style={{
                    flex: 1, overflowY: 'auto', padding: '16px 24px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    scrollbarWidth: 'thin', scrollbarColor: 'rgba(186,143,13,0.1) transparent',
                }}
            >
                {/* Load Older Button */}
                {hasMore && (
                    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                        <button
                            onClick={loadOlderMessages}
                            disabled={loadingOlder}
                            style={{
                                padding: '8px 20px', borderRadius: 20,
                                background: 'rgba(186,143,13,0.08)', border: '1px solid rgba(186,143,13,0.15)',
                                color: 'var(--accent)', fontSize: 12.5, fontWeight: 500,
                                cursor: loadingOlder ? 'default' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                transition: 'all 0.15s',
                            }}
                        >
                            <ArrowUp size={13} />
                            {loadingOlder ? 'Loading...' : 'Load older messages'}
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {messages.length === 0 && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flex: 1, gap: 16, padding: 40,
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 22,
                            background: 'linear-gradient(135deg, rgba(186,143,13,0.12), rgba(186,143,13,0.04))',
                            border: '1px solid rgba(186,143,13,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <MessageSquare size={28} color="var(--accent)" strokeWidth={1.3} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                                Start a Conversation
                            </h4>
                            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5, margin: 0 }}>
                                Send a message to {advisor.name} to get started. All messages are securely stored.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                            {['Hi! I need financial advice', 'Can you review my portfolio?', 'I want to start investing'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                    style={{
                                        padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                                        background: 'rgba(26,13,0,0.5)', border: '1px solid var(--card-border)',
                                        color: 'var(--text-secondary)', fontSize: 13,
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = 'rgba(186,143,13,0.3)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'var(--card-border)';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages with Date Separators */}
                {enrichedMessages.map((item, idx) => {
                    if (item.type === 'date-sep') {
                        return (
                            <div key={`sep-${item.key}`} style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                margin: '12px 0', padding: '0 20px',
                            }}>
                                <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
                                <span style={{
                                    fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500,
                                    padding: '4px 14px', borderRadius: 12,
                                    background: 'rgba(186,143,13,0.05)', border: '1px solid var(--divider)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {formatDateSeparator(item.date)}
                                </span>
                                <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
                            </div>
                        );
                    }

                    const msg = item;
                    const isMine = msg.sender?.id === 'me' || msg.senderId !== advisor.id;

                    return (
                        <div
                            key={msg.id}
                            style={{
                                display: 'flex', gap: 10,
                                flexDirection: isMine ? 'row-reverse' : 'row',
                                maxWidth: '100%',
                                opacity: msg.isPending ? 0.6 : 1,
                                transition: 'opacity 0.3s',
                            }}
                        >
                            {/* Avatar */}
                            {!isMine && (
                                <div style={{
                                    width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                                    background: 'linear-gradient(135deg, var(--accent), var(--bright-gold))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#000', fontWeight: 700, fontSize: 13,
                                    boxShadow: '0 2px 8px rgba(186,143,13,0.2)',
                                }}>
                                    {(advisor.name || '?')[0].toUpperCase()}
                                </div>
                            )}

                            {/* Bubble */}
                            <div style={{ maxWidth: '72%', minWidth: 0 }}>
                                <div style={{
                                    padding: '12px 16px', borderRadius: 18,
                                    borderTopRightRadius: isMine ? 4 : 18,
                                    borderTopLeftRadius: isMine ? 18 : 4,
                                    background: isMine
                                        ? 'linear-gradient(135deg, var(--accent), #c99e15)'
                                        : 'var(--card-bg)',
                                    color: isMine ? '#000' : 'var(--text-primary)',
                                    border: isMine ? 'none' : '1px solid var(--card-border)',
                                    fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    boxShadow: isMine
                                        ? '0 2px 10px rgba(186,143,13,0.2)'
                                        : '0 1px 3px rgba(0,0,0,0.15)',
                                }}>
                                    {msg.content}
                                </div>
                                {/* Time + Read Receipt */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                                    marginTop: 4, paddingInline: 4,
                                }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {formatTime(msg.createdAt)}
                                    </span>
                                    {isMine && !msg.isPending && (
                                        msg.isRead
                                            ? <CheckCheck size={13} color="var(--accent)" strokeWidth={2} />
                                            : <Check size={13} color="var(--text-muted)" strokeWidth={2} />
                                    )}
                                    {msg.isPending && (
                                        <Clock size={11} color="var(--text-muted)" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
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
                        placeholder={`Message ${advisor.name}...`}
                        style={{
                            flex: 1, padding: '10px 0', border: 'none',
                            background: 'transparent', color: 'var(--text-primary)',
                            fontSize: 14.5, outline: 'none', lineHeight: 1.5,
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={sending || !input.trim()}
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
                        <Send size={15} /> Send
                    </button>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, opacity: 0.6 }}>
                    Messages are stored securely · Chat history is preserved across sessions
                </p>
            </div>
        </div>
    );
}
