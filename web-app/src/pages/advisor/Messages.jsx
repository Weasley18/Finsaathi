import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api';
import { MessageSquare, Send, User, Search, Circle, Plus, X } from 'lucide-react';

export default function AdvisorMessages() {
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [clientList, setClientList] = useState([]);
    const [clientSearch, setClientSearch] = useState('');
    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);
    const initialOpenDone = useRef(false);

    useEffect(() => {
        loadConversations();
    }, []);

    // Poll for new messages every 5 seconds
    useEffect(() => {
        if (activeConversation) {
            pollRef.current = setInterval(() => {
                loadMessages(activeConversation.partner.id, true);
            }, 5000);
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        try {
            const res = await api.getConversations();
            const convs = res.conversations || [];
            setConversations(convs);

            // Auto-open conversation if navigated with client state
            if (!initialOpenDone.current && location.state?.clientId) {
                initialOpenDone.current = true;
                const clientId = location.state.clientId;
                const clientName = location.state.clientName;
                const existing = convs.find(c => c.partner?.id === clientId);
                if (existing) {
                    openConversation(existing);
                } else {
                    // Start a new conversation with this client (no prior messages)
                    const newConv = {
                        partner: { id: clientId, name: clientName || 'Client', role: 'END_USER', isActive: false },
                        lastMessage: null,
                        unreadCount: 0,
                    };
                    setConversations(prev => [newConv, ...prev]);
                    setActiveConversation(newConv);
                    setMessages([]);
                }
            }
        } catch (err) {
            console.error('Failed to load conversations', err);
        } finally {
            setLoading(false);
        }
    };

    const openNewChatPicker = async () => {
        setShowNewChat(true);
        try {
            const me = await api.getMe();
            const res = await api.getAdvisorClients(me.user?.id || me.id);
            setClientList(res.clients || []);
        } catch (err) {
            console.error('Failed to load clients', err);
        }
    };

    const startNewConversation = (client) => {
        setShowNewChat(false);
        setClientSearch('');
        // Check if conversation already exists
        const existing = conversations.find(c => c.partner?.id === client.id);
        if (existing) {
            openConversation(existing);
            return;
        }
        // Create a virtual conversation entry
        const newConv = {
            partner: { id: client.id, name: client.name, role: 'END_USER', isActive: false },
            lastMessage: null,
            unreadCount: 0,
        };
        setConversations(prev => [newConv, ...prev]);
        setActiveConversation(newConv);
        setMessages([]);
    };

    const loadMessages = async (partnerId, silent = false) => {
        try {
            const res = await api.getConversation(partnerId);
            setMessages(res.messages || []);
            if (!silent && res.partner) {
                setActiveConversation(prev => prev ? { ...prev, partner: res.partner } : prev);
            }
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    };

    const openConversation = (conv) => {
        setActiveConversation(conv);
        loadMessages(conv.partner.id);
        // Update unread count in list
        setConversations(prev => prev.map(c =>
            c.partner.id === conv.partner.id ? { ...c, unreadCount: 0 } : c
        ));
    };

    const sendMessage = async () => {
        if (!input.trim() || sending || !activeConversation) return;
        const content = input.trim();
        setInput('');
        setSending(true);

        // Optimistic update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            senderId: 'me',
            receiverId: activeConversation.partner.id,
            content,
            isRead: false,
            createdAt: new Date().toISOString(),
            sender: { id: 'me', name: 'You', role: 'ADVISOR' },
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await api.sendDirectMessage(activeConversation.partner.id, content);
            // Reload to get server-assigned ID
            await loadMessages(activeConversation.partner.id, true);
            loadConversations(); // refresh sidebar
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        }
        setSending(false);
    };

    const filteredConversations = conversations.filter(c =>
        !searchQuery || c.partner?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
            <header className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MessageSquare size={22} color="var(--accent)" /> Messages
                        </h2>
                        <p style={{ color: 'var(--text-muted)' }}>Direct communication with your clients</p>
                    </div>
                    <button className="btn btn-primary" style={{ gap: 6 }} onClick={openNewChatPicker}>
                        <Plus size={16} /> New Chat
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, gap: 0, overflow: 'hidden', borderRadius: 16, border: '1px solid var(--card-border)' }}>
                {/* Conversations List */}
                <div style={{
                    width: 320, borderRight: '1px solid var(--card-border)',
                    display: 'flex', flexDirection: 'column', background: 'var(--card-bg)',
                }}>
                    <div style={{ padding: 16 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input"
                                style={{ paddingLeft: 36, width: '100%' }}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading && <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div>}
                        {!loading && filteredConversations.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                <MessageSquare size={32} strokeWidth={1} />
                                <p style={{ marginTop: 8, fontSize: 13 }}>No conversations yet</p>
                            </div>
                        )}
                        {filteredConversations.map(conv => (
                            <div
                                key={conv.partner.id}
                                onClick={() => openConversation(conv)}
                                style={{
                                    display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--divider)',
                                    background: activeConversation?.partner?.id === conv.partner.id ? 'rgba(186,143,13,0.08)' : 'transparent',
                                }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--accent), var(--bright-gold))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#000', fontWeight: 700, fontSize: 14, flexShrink: 0,
                                    position: 'relative',
                                }}>
                                    {(conv.partner?.name || '?')[0].toUpperCase()}
                                    {conv.partner?.isActive && (
                                        <Circle
                                            size={10}
                                            fill="var(--success)"
                                            color="var(--success)"
                                            style={{ position: 'absolute', bottom: -1, right: -1 }}
                                        />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{conv.partner?.name || 'Unknown'}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                        <span style={{
                                            fontSize: 12, color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180,
                                        }}>
                                            {conv.lastMessage?.content || 'No messages yet'}
                                        </span>
                                        {conv.unreadCount > 0 && (
                                            <span style={{
                                                background: 'var(--accent)', color: '#000',
                                                borderRadius: 10, padding: '2px 6px', fontSize: 10, fontWeight: 700,
                                            }}>
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Message Thread */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(13,5,0,0.4)' }}>
                    {!activeConversation ? (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
                        }}>
                            <MessageSquare size={48} strokeWidth={1} />
                            <p style={{ marginTop: 12 }}>Select a conversation to start messaging</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 20px', borderBottom: '1px solid var(--card-border)',
                                background: 'var(--card-bg)',
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--accent), var(--bright-gold))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#000', fontWeight: 700, fontSize: 14,
                                }}>
                                    {(activeConversation.partner?.name || '?')[0]}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{activeConversation.partner?.name}</div>
                                    <div style={{ fontSize: 11, color: activeConversation.partner?.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                                        {activeConversation.partner?.isActive ? 'Online' : 'Offline'}
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {messages.map(msg => {
                                    const isMine = msg.sender?.id === 'me' || msg.senderId !== activeConversation.partner.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            style={{
                                                display: 'flex', gap: 8,
                                                flexDirection: isMine ? 'row-reverse' : 'row',
                                            }}
                                        >
                                            <div style={{
                                                maxWidth: '70%', padding: '10px 14px', borderRadius: 14,
                                                background: isMine ? 'var(--accent)' : 'var(--card-bg)',
                                                color: isMine ? '#000' : 'var(--text-primary)',
                                                border: isMine ? 'none' : '1px solid var(--card-border)',
                                                fontSize: 14, lineHeight: 1.5,
                                            }}>
                                                {msg.content}
                                                <div style={{
                                                    fontSize: 10, marginTop: 4,
                                                    color: isMine ? 'rgba(0,0,0,0.5)' : 'var(--text-muted)',
                                                    textAlign: 'right',
                                                }}>
                                                    {formatTime(msg.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{
                                display: 'flex', gap: 8, padding: '12px 20px',
                                borderTop: '1px solid var(--card-border)', background: 'var(--card-bg)',
                            }}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1, padding: '10px 14px', borderRadius: 12,
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)',
                                        color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={sending || !input.trim()}
                                    style={{
                                        padding: '10px 16px', borderRadius: 12,
                                        background: input.trim() ? 'var(--accent)' : 'rgba(186,143,13,0.2)',
                                        border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        color: input.trim() ? '#000' : 'var(--text-muted)',
                                    }}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* New Chat Client Picker Modal */}
            {showNewChat && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
                }} onClick={() => setShowNewChat(false)}>
                    <div className="glass-card" style={{ width: 400, maxHeight: '70vh', padding: 0, overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
                            <h3 style={{ margin: 0, fontSize: 16 }}>Start New Conversation</h3>
                            <button onClick={() => setShowNewChat(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '12px 20px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    className="input"
                                    style={{ paddingLeft: 36, width: '100%' }}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '0 8px 12px' }}>
                            {clientList
                                .filter(c => !clientSearch || c.name?.toLowerCase().includes(clientSearch.toLowerCase()))
                                .map(client => {
                                    const alreadyExists = conversations.some(conv => conv.partner?.id === client.id);
                                    return (
                                        <div
                                            key={client.id}
                                            onClick={() => startNewConversation(client)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                                borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                                                background: 'transparent',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,143,13,0.08)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--accent), var(--bright-gold))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#000', fontWeight: 700, fontSize: 14, flexShrink: 0,
                                            }}>
                                                {(client.name || '?')[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{client.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{client.phone || 'Client'}</div>
                                            </div>
                                            {alreadyExists && (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>existing</span>
                                            )}
                                        </div>
                                    );
                                })}
                            {clientList.length === 0 && (
                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                    No clients assigned to you yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
