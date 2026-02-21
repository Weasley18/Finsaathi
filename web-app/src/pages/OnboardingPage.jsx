import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Briefcase, Building2, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [role, setRole] = useState(null); // 'END_USER', 'ADVISOR', 'PARTNER'
    const [name, setName] = useState('');
    const [businessId, setBusinessId] = useState(''); // ARN or GSTIN
    const [income, setIncome] = useState('FROM_25K_TO_50K');
    const [goal, setGoal] = useState('MODERATE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!role || !name) return;
        setLoading(true);
        setError('');

        try {
            const payload = {
                name,
                role,
                ...(role === 'END_USER' ? { incomeRange: income, riskProfile: goal } : {}),
                ...((role === 'ADVISOR' || role === 'PARTNER') ? { businessId } : {})
            };

            await api.completeProfile(payload);

            // Redirect will be handled by ProtectedRoute / App.js if PENDING
            if (role === 'ADVISOR' || role === 'PARTNER') {
                window.location.href = '/waiting-room';
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            console.error('Failed to complete profile', err);
            setError('Failed to setup your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>{t('onboarding.welcome')}</h1>
                <p style={styles.subtitle}>{t('onboarding.subtitle')}</p>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.roleGrid}>
                    <button
                        style={{ ...styles.roleCard, ...(role === 'END_USER' ? styles.roleCardActive : {}) }}
                        onClick={() => setRole('END_USER')}
                    >
                        <User size={28} color={role === 'END_USER' ? '#d4af35' : 'rgba(255,255,255,0.4)'} />
                        <div style={styles.roleTitle}>{t('onboarding.individual')}</div>
                        <div style={styles.roleDesc}>{t('onboarding.individualDesc')}</div>
                    </button>

                    <button
                        style={{ ...styles.roleCard, ...(role === 'ADVISOR' ? styles.roleCardActive : {}) }}
                        onClick={() => setRole('ADVISOR')}
                    >
                        <Briefcase size={28} color={role === 'ADVISOR' ? '#d4af35' : 'rgba(255,255,255,0.4)'} />
                        <div style={styles.roleTitle}>{t('onboarding.advisor')}</div>
                        <div style={styles.roleDesc}>{t('onboarding.advisorDesc')}</div>
                    </button>

                    <button
                        style={{ ...styles.roleCard, ...(role === 'PARTNER' ? styles.roleCardActive : {}) }}
                        onClick={() => setRole('PARTNER')}
                    >
                        <Building2 size={28} color={role === 'PARTNER' ? '#d4af35' : 'rgba(255,255,255,0.4)'} />
                        <div style={styles.roleTitle}>{t('onboarding.partner')}</div>
                        <div style={styles.roleDesc}>{t('onboarding.partnerDesc')}</div>
                    </button>
                </div>

                {role && (
                    <form onSubmit={handleSubmit} style={styles.formSection}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>{t('onboarding.fullName')} {role === 'PARTNER' && `/ ${t('onboarding.companyName')}`}</label>
                            <input
                                className="input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={role === 'PARTNER' ? "e.g. Acme Finance" : "e.g. Rahul Sharma"}
                                required
                            />
                        </div>

                        {role === 'END_USER' && (
                            <>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>{t('onboarding.monthlyIncome')}</label>
                                    <select className="input" value={income} onChange={e => setIncome(e.target.value)} style={styles.select}>
                                        <option value="BELOW_10K">&lt; ₹15,000</option>
                                        <option value="FROM_10K_TO_25K">₹15K - ₹30K</option>
                                        <option value="FROM_25K_TO_50K">₹30K - ₹50K</option>
                                        <option value="FROM_50K_TO_1L">₹50K - ₹1L</option>
                                        <option value="ABOVE_1L">&gt; ₹1 Lakh</option>
                                    </select>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>{t('onboarding.primaryGoal')}</label>
                                    <select className="input" value={goal} onChange={e => setGoal(e.target.value)} style={styles.select}>
                                        <option value="CONSERVATIVE">Capital Preservation (Safe)</option>
                                        <option value="MODERATE">Balanced Growth</option>
                                        <option value="AGGRESSIVE">Aggressive Wealth Creation</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {role === 'ADVISOR' && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>{t('onboarding.arnNumber')}</label>
                                <input
                                    className="input"
                                    value={businessId}
                                    onChange={e => setBusinessId(e.target.value)}
                                    placeholder="e.g. ARN-123456"
                                    required
                                />
                                <div style={styles.helpText}>{t('onboarding.arnHelp')}</div>
                            </div>
                        )}

                        {role === 'PARTNER' && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>{t('onboarding.gstin')}</label>
                                <input
                                    className="input"
                                    value={businessId}
                                    onChange={e => setBusinessId(e.target.value)}
                                    placeholder="e.g. 27AAAAA0000A1Z5"
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!name || ((role === 'ADVISOR' || role === 'PARTNER') && !businessId) || loading}
                            style={{
                                ...styles.submitBtn,
                                opacity: (!name || ((role === 'ADVISOR' || role === 'PARTNER') && !businessId) || loading) ? 0.5 : 1
                            }}
                        >
                            {loading ? t('onboarding.settingUp') : t('onboarding.completeProfile')} <ArrowRight size={18} />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#0A0500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 600,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 40,
        backdropFilter: 'blur(20px)',
    },
    title: {
        fontSize: 28,
        fontWeight: 700,
        color: '#d4af35',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 32,
    },
    error: {
        backgroundColor: 'rgba(255, 75, 75, 0.1)',
        color: '#ff4b4b',
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
        textAlign: 'center',
        border: '1px solid rgba(255, 75, 75, 0.2)',
    },
    roleGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 32,
    },
    roleCard: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: 'white',
    },
    roleCardActive: {
        background: 'rgba(212, 175, 55, 0.1)',
        borderColor: '#d4af35',
        boxShadow: '0 4px 20px rgba(212, 175, 55, 0.15)',
    },
    roleTitle: {
        fontSize: 15,
        fontWeight: 600,
        marginTop: 12,
        marginBottom: 4,
    },
    roleDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.4,
    },
    formSection: {
        animation: 'fadeIn 0.3s ease-out',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    select: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '14px 16px',
        appearance: 'none',
        outline: 'none',
    },
    helpText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 6,
    },
    submitBtn: {
        width: '100%',
        background: 'linear-gradient(135deg, #d4af35, #FFD700)',
        color: 'black',
        border: 'none',
        padding: '16px 24px',
        borderRadius: 12,
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 32,
    }
};
