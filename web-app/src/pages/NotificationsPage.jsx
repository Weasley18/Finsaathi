import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Bell, Check, CheckCheck, Trash2, MessageSquare, TrendingUp, Phone, AlertTriangle, Info } from 'lucide-react';

const typeConfig = {
    direct_message: { icon: MessageSquare, color: 'var(--info)' },
    recommendation: { icon: TrendingUp, color: 'var(--accent)' },
    recommendation_response: { icon: TrendingUp, color: 'var(--success)' },
    scheduled_call: { icon: Phone, color: 'var(--info)' },
    call_cancelled: { icon: Phone, color: 'var(--error)' },
    call_rescheduled: { icon: Phone, color: 'var(--warning)' },
    client_flag: { icon: AlertTriangle, color: 'var(--error)' },
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const res = await api.getNotifications(50);
            setNotifications(res.notifications || []);
            setUnreadCount(res.unreadCount || 0);
        } catch (err) {
            console.error('Failed to load notifications', err);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (ids) => {
        try {
            await api.markNotificationsRead(ids);
            setNotifications(prev => prev.map(n =>
                ids.includes(n.id) ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - ids.length));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read', err);
        }
    };

    const deleteNotif = async (id) => {
        try {
            await api.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const getNotifType = (notif) => {
        try {
            const data = notif.data ? JSON.parse(notif.data) : {};
            return data.type || 'default';
        } catch { return 'default'; }
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

    return (
        <div>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bell size={22} color="var(--accent)" /> Notifications
                        {unreadCount > 0 && (
                            <span className="badge badge-error" style={{ fontSize: 11 }}>{unreadCount} new</span>
                        )}
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>Stay updated on important events</p>
                </div>
                {unreadCount > 0 && (
                    <button className="btn btn-secondary" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCheck size={14} /> Mark All Read
                    </button>
                )}
            </header>

            {notifications.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <Bell size={48} strokeWidth={1} />
                    <p style={{ marginTop: 12 }}>No notifications yet</p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.map(notif => {
                    const nType = getNotifType(notif);
                    const config = typeConfig[nType] || { icon: Info, color: 'var(--text-muted)' };
                    const Icon = config.icon;

                    return (
                        <div
                            key={notif.id}
                            className="glass-card"
                            style={{
                                display: 'flex', alignItems: 'start', gap: 12, padding: '14px 16px',
                                opacity: notif.isRead ? 0.7 : 1,
                                borderLeft: notif.isRead ? 'none' : `3px solid ${config.color}`,
                            }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${config.color}15`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Icon size={18} color={config.color} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{notif.title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{notif.message}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatTime(notif.createdAt)}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {!notif.isRead && (
                                    <button
                                        onClick={() => markRead([notif.id])}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-muted)', padding: 4,
                                        }}
                                        title="Mark as read"
                                    >
                                        <Check size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteNotif(notif.id)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-muted)', padding: 4,
                                    }}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
