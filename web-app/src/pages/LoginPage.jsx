import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, setAuthToken } from '../api';
import { Sparkles, ArrowRight, Phone, Shield } from 'lucide-react';

export default function LoginPage() {
    const { t } = useTranslation();
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (phone.length < 10) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.sendOtp(phone);
            if (res?.otp) setError(`Dev OTP: ${res.otp}`);
            setStep('otp');
        } catch (err) {
            setError('Failed to send OTP. Is the backend running?');
        }
        setLoading(false);
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.verifyOtp(phone, otp);
            setAuthToken(res.token);
            setAuthToken(res.token);

            // Redirect based on role
            const role = res.user?.role;
            const isNewUser = res.user?.isNewUser;

            if (isNewUser) {
                window.location.href = '/onboarding';
            } else if (role === 'ADMIN') {
                window.location.href = '/admin';
            } else if (role === 'ADVISOR') {
                window.location.href = '/advisor';
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            setError('Invalid OTP');
        }
        setLoading(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logo}>
                    <div style={styles.logoIcon}><Sparkles size={28} color="#000" /></div>
                    <h1 style={styles.title}>{t('common.appName')}</h1>
                    <p style={styles.subtitle}>{t('auth.tagline')}</p>
                </div>

                {step === 'phone' ? (
                    <form onSubmit={handleSendOtp}>
                        <div style={styles.formHeader}>
                            <Phone size={18} color="var(--accent)" />
                            <span style={styles.formTitle}>{t('auth.enterPhone')}</span>
                        </div>
                        <div style={styles.phoneRow}>
                            <span style={styles.countryCode}>+91</span>
                            <input
                                className="input"
                                type="tel"
                                placeholder="9876543210"
                                maxLength={10}
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                style={{ flex: 1 }}
                                autoFocus
                            />
                        </div>
                        {error && <p style={styles.error}>{error}</p>}
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={phone.length < 10 || loading}
                            style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '14px 20px' }}
                        >
                            {loading ? t('auth.sending') : t('auth.sendOtp')} <ArrowRight size={16} />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify}>
                        <div style={styles.formHeader}>
                            <Shield size={18} color="var(--accent)" />
                            <span style={styles.formTitle}>{t('auth.verifyOtp')}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                            {t('auth.enterOtp', { phone })}
                        </p>
                        <input
                            className="input"
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, padding: '14px 20px' }}
                            autoFocus
                        />
                        {error && <p style={styles.error}>{error}</p>}
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={otp.length !== 6 || loading}
                            style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '14px 20px' }}
                        >
                            {loading ? t('auth.verifying') : t('auth.verifyLogin')}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginTop: 12, fontSize: 14, display: 'block', margin: '12px auto 0' }}
                        >
                            {t('auth.changeNumber')}
                        </button>
                    </form>
                )}

                <p style={styles.footer}>
                    {t('auth.encrypted')}
                </p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #0A0500, #1C0A00, #0A0500)',
    },
    card: {
        width: '100%',
        maxWidth: 420,
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 24,
        backdropFilter: 'blur(20px)',
        padding: 40,
        boxShadow: 'var(--shadow-elevated)',
    },
    logo: {
        textAlign: 'center',
        marginBottom: 36,
    },
    logoIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        background: 'linear-gradient(135deg, #ba8f0d, #FFD700)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
    },
    title: {
        fontSize: 28,
        fontWeight: 800,
        background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 14,
        color: 'var(--text-secondary)',
        marginTop: 4,
    },
    formHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    phoneRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    countryCode: {
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
    },
    error: {
        color: 'var(--warning)',
        fontSize: 13,
        marginTop: 10,
        textAlign: 'center',
    },
    footer: {
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 11,
        marginTop: 24,
    },
};
