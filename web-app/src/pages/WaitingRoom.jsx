import React from 'react';
import { Hourglass, LogOut, MessageSquare, Phone } from 'lucide-react';

export default function WaitingRoom({ user, onLogout }) {
    const formattedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
    }) : 'Just now';

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0A0500',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: '"Inter", sans-serif'
        }}>
            <div style={{
                position: 'fixed', top: 24, right: 24, zIndex: 10
            }}>
                <button
                    onClick={onLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#d4af35',
                        padding: '10px 16px',
                        borderRadius: 30,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500
                    }}
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>

            <div style={{
                width: '100%',
                maxWidth: 480,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: 24,
                padding: 40,
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}>
                <div style={{
                    width: 72, height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 24,
                    boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)'
                }}>
                    <Hourglass size={32} color="#d4af35" style={{ animation: 'spin 4s linear infinite' }} />
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px 0', color: '#d4af35' }}>
                    Application Under Review
                </h1>

                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: '0 0 32px 0', lineHeight: 1.5 }}>
                    We are currently verifying your {user?.role === 'PARTNER' ? 'Corporate details' : 'SEBI ARN details'}. This usually takes 24-48 hours. We appreciate your patience.
                </p>

                <div style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 32,
                    border: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'left'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Name</span>
                        <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{user?.name || 'Not provided'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Phone</span>
                        <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{user?.phone}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{user?.role === 'PARTNER' ? 'GSTIN' : 'ARN Number'}</span>
                        <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{user?.businessId || 'Under Review'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Submitted On</span>
                        <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{formattedDate}</span>
                    </div>
                </div>

                <button style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid #d4af35',
                    color: '#d4af35',
                    padding: '14px 24px',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 16,
                    transition: 'all 0.2s'
                }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                    <MessageSquare size={18} /> Contact Support
                </button>

                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    Need urgent help? <span style={{ color: '#d4af35', cursor: 'pointer' }}>Chat with us</span>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
