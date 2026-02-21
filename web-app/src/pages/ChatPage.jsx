import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MessageSquare, Send, Sparkles, Bot, User, Trash2 } from 'lucide-react';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getChatHistory?.()
            .then(data => setMessages(data.messages || []))
            .catch(() => { });
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, id: Date.now() }]);
        setLoading(true);

        try {
            const res = await api.sendChatMessage(userMsg);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.response,
                id: res.messageId,
                toolsUsed: res.toolsUsed,
                detectedLanguage: res.detectedLanguage,
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I ran into an issue. Please try again! 🙏',
                id: Date.now() + 1,
            }]);
        }
        setLoading(false);
    };

    const clearChat = async () => {
        await api.clearChatHistory?.().catch(() => { });
        setMessages([]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={22} color="var(--accent)" /> FinSaathi AI
                    </h2>
                    <p>Your multilingual financial advisor • Supports Hindi, Tamil, Telugu & more</p>
                </div>
                <button className="btn btn-outline" onClick={clearChat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={14} /> Clear
                </button>
            </header>

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '0 4px',
                display: 'flex', flexDirection: 'column', gap: 12,
            }}>
                {messages.length === 0 && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        flex: 1, color: 'var(--text-muted)', gap: 12,
                    }}>
                        <Bot size={48} strokeWidth={1} />
                        <p>Ask me anything about your finances!</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['How is my financial health?', 'मेरा बजट कितना है?', 'Suggest a SIP plan', 'Which govt schemes can I use?'].map(q => (
                                <button
                                    key={q}
                                    className="glass-card"
                                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13, border: '1px solid var(--card-border)' }}
                                    onClick={() => { setInput(q); }}
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
                            {msg.role === 'user' ? <User size={16} color="#000" /> : <Bot size={16} color="var(--accent)" />}
                        </div>
                        <div style={{
                            maxWidth: '70%', padding: '12px 16px', borderRadius: 16,
                            background: msg.role === 'user' ? 'var(--accent)' : 'var(--card-bg)',
                            color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
                            fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                        }}>
                            {msg.content}
                            {msg.toolsUsed?.length > 0 && (
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {msg.toolsUsed.map(t => (
                                        <span key={t} style={{ padding: '2px 6px', borderRadius: 6, background: 'rgba(186,143,13,0.1)' }}>{t}</span>
                                    ))}
                                </div>
                            )}
                            {msg.detectedLanguage && msg.detectedLanguage !== 'en' && (
                                <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>
                                    🌐 Detected: {msg.detectedLanguage}
                                </div>
                            )}
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
                            <Bot size={16} color="var(--accent)" />
                        </div>
                        <div className="glass-card" style={{ padding: '12px 16px', fontSize: 14 }}>
                            <span className="typing-dots">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{
                display: 'flex', gap: 8, padding: '16px 0 8px',
                borderTop: '1px solid var(--card-border)',
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message in any language..."
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
    );
}
