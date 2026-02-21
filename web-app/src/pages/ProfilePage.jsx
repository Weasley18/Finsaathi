import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, setAuthToken } from '../api';
import { User, Shield, DollarSign, Globe, TrendingUp, Save, LogOut, Edit3, X, Check, Sparkles } from 'lucide-react';

const INCOME_RANGES = [
    { value: 'BELOW_10K', label: '< ₹10,000' },
    { value: 'FROM_10K_TO_25K', label: '₹10K – ₹25K' },
    { value: 'FROM_25K_TO_50K', label: '₹25K – ₹50K' },
    { value: 'FROM_50K_TO_1L', label: '₹50K – ₹1L' },
    { value: 'ABOVE_1L', label: '> ₹1 Lakh' },
];

const RISK_PROFILES = [
    { value: 'CONSERVATIVE', label: 'Conservative', emoji: '🛡️', desc: 'Low risk, stable returns' },
    { value: 'MODERATE', label: 'Moderate', emoji: '⚖️', desc: 'Balanced risk & growth' },
    { value: 'AGGRESSIVE', label: 'Aggressive', emoji: '🚀', desc: 'High risk, high potential' },
];

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
    { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'or', label: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
    { code: 'as', label: 'অসমীয়া', flag: '🇮🇳' },
];

export default function ProfilePage() {
    const { t, i18n } = useTranslation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editIncome, setEditIncome] = useState('');
    const [editRisk, setEditRisk] = useState('');
    const [editLang, setEditLang] = useState('en');

    useEffect(() => {
        api.getMe()
            .then(data => {
                const u = data.user || data;
                setUser(u);
                setEditName(u.name || '');
                setEditIncome(u.incomeRange || '');
                setEditRisk(u.riskProfile || '');
                setEditLang(u.language || 'en');
            })
            .catch(err => console.error('Failed to load profile:', err))
            .finally(() => setLoading(false));
    }, []);

    const startEditing = () => {
        setEditName(user?.name || '');
        setEditIncome(user?.incomeRange || '');
        setEditRisk(user?.riskProfile || '');
        setEditLang(user?.language || 'en');
        setEditing(true);
    };

    const handleSave = async () => {
        if (!editName.trim()) { alert('Name is required.'); return; }
        setSaving(true);
        try {
            const profileData = { name: editName.trim(), language: editLang };
            if (editIncome) profileData.incomeRange = editIncome;
            if (editRisk) profileData.riskProfile = editRisk;

            await api.updateProfile(profileData);

            // Switch i18n language if changed
            if (editLang !== user?.language) {
                i18n.changeLanguage(editLang);
            }

            // Refresh user data
            const data = await api.getMe();
            const u = data.user || data;
            setUser(u);
            setEditing(false);
        } catch (err) {
            alert('Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        if (!confirm('Are you sure you want to logout?')) return;
        setAuthToken(null);
        window.location.href = '/login';
    };

    const getIncomeLabel = (val) => INCOME_RANGES.find(r => r.value === val)?.label || 'Not set';
    const getRiskInfo = (val) => RISK_PROFILES.find(r => r.value === val) || null;
    const getLangLabel = (code) => LANGUAGES.find(l => l.code === code) || LANGUAGES[0];

    if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>{t('common.loading')}</div>;

    return (
        <div>
            <div className="page-header">
                <h2>{t('profile.title')}</h2>
                <p>{t('profile.subtitle')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
                {/* Profile Card */}
                <div className="glass-card" style={{ padding: 32, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: 24,
                                background: 'linear-gradient(135deg, #ba8f0d, #FFD700)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 28, fontWeight: 800, color: '#000',
                                boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
                            }}>
                                {(user?.name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                                    {user?.name || 'User'}
                                </h2>
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0' }}>
                                    +91 {user?.phone || '—'}
                                </p>
                                <span className="badge badge-gold">
                                    {user?.role === 'ADVISOR' ? '🏅 Advisor' : user?.role === 'ADMIN' ? '⚙️ Admin' : user?.role === 'PARTNER' ? '🤝 Partner' : '👤 Member'}
                                </span>
                            </div>
                        </div>
                        {!editing && (
                            <button className="btn btn-outline" onClick={startEditing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Edit3 size={14} /> {t('profile.editProfile')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Account Details */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={18} color="var(--accent)" /> {t('profile.accountDetails')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <InfoRow icon={<User size={16} />} label={t('profile.name')} value={user?.name || t('common.notSet')} color="var(--accent)" />
                        <InfoRow icon={<DollarSign size={16} />} label={t('profile.incomeRange')} value={getIncomeLabel(user?.incomeRange)} color="#4caf50" />
                        <InfoRow icon={<TrendingUp size={16} />} label={t('profile.riskProfile')}
                            value={getRiskInfo(user?.riskProfile) ? `${getRiskInfo(user?.riskProfile).emoji} ${getRiskInfo(user?.riskProfile).label}` : t('common.notSet')}
                            color="#e91e63" />
                        <InfoRow icon={<Globe size={16} />} label={t('profile.language')} value={`${getLangLabel(user?.language).flag} ${getLangLabel(user?.language).label}`} color="#3f51b5" />
                        <InfoRow icon={<Sparkles size={16} />} label={t('profile.memberSince')}
                            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                            color="#9c27b0" />
                    </div>
                </div>

                {/* Financial Profile */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={18} color="var(--accent)" /> {t('profile.financialProfile')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                            padding: 20, borderRadius: 16,
                            background: 'rgba(186,143,13,0.08)', border: '1px solid rgba(186,143,13,0.2)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 8 }}>{t('profile.healthScoreLabel')}</div>
                            <div style={{ fontSize: 42, fontWeight: 800, color: 'var(--bright-gold)' }}>
                                {user?.financialProfile?.healthScore || 50}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('profile.outOf100')}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <MiniStat label={t('profile.transactions')} value={user?._count?.transactions ?? '—'} />
                            <MiniStat label={t('profile.goals')} value={user?._count?.goals ?? '—'} />
                            <MiniStat label={t('profile.documents')} value={user?._count?.documents ?? '—'} />
                            <MiniStat label={t('profile.status')} value={user?.isActive ? t('profile.active') : t('profile.inactive')} />
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 className="section-title" style={{ margin: 0 }}>{t('profile.session')}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{t('profile.sessionDesc')}</p>
                        </div>
                        <button className="btn btn-outline" onClick={handleLogout}
                            style={{ color: 'var(--error)', borderColor: 'rgba(231,76,60,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <LogOut size={14} /> {t('common.logout')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editing && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setEditing(false)}>
                    <div className="glass-card" style={{ padding: 32, width: 520, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                            <h3 style={{ margin: 0, fontSize: 22 }}>{t('profile.editProfile')}</h3>
                            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Name */}
                        <FieldLabel>NAME</FieldLabel>
                        <input className="input" value={editName} onChange={e => setEditName(e.target.value)}
                            placeholder="Your name" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 20 }} />

                        {/* Income Range */}
                        <FieldLabel>MONTHLY INCOME RANGE</FieldLabel>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                            {INCOME_RANGES.map(range => (
                                <button key={range.value}
                                    onClick={() => setEditIncome(range.value)}
                                    style={{
                                        padding: '10px 16px', borderRadius: 12, border: '1.5px solid',
                                        borderColor: editIncome === range.value ? 'var(--accent)' : 'var(--card-border)',
                                        background: editIncome === range.value ? 'rgba(186,143,13,0.12)' : 'var(--surface)',
                                        color: editIncome === range.value ? 'var(--bright-gold)' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontSize: 13, fontWeight: editIncome === range.value ? 700 : 500,
                                        display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                                    }}>
                                    {range.label}
                                    {editIncome === range.value && <Check size={14} color="var(--bright-gold)" />}
                                </button>
                            ))}
                        </div>

                        {/* Risk Profile */}
                        <FieldLabel>RISK PROFILE</FieldLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                            {RISK_PROFILES.map(risk => (
                                <button key={risk.value}
                                    onClick={() => setEditRisk(risk.value)}
                                    style={{
                                        padding: 16, borderRadius: 14, border: '1.5px solid',
                                        borderColor: editRisk === risk.value ? 'var(--accent)' : 'var(--card-border)',
                                        background: editRisk === risk.value ? 'rgba(186,143,13,0.12)' : 'var(--surface)',
                                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                    }}>
                                    <div style={{ fontSize: 28, marginBottom: 6 }}>{risk.emoji}</div>
                                    <div style={{
                                        fontSize: 13, fontWeight: 600, marginBottom: 4,
                                        color: editRisk === risk.value ? 'var(--bright-gold)' : 'var(--text-secondary)',
                                    }}>{risk.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{risk.desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Language */}
                        <FieldLabel>LANGUAGE</FieldLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
                            {LANGUAGES.map(lang => (
                                <button key={lang.code}
                                    onClick={() => setEditLang(lang.code)}
                                    style={{
                                        padding: 14, borderRadius: 14, border: '1.5px solid',
                                        borderColor: editLang === lang.code ? 'var(--bright-gold)' : 'var(--card-border)',
                                        background: editLang === lang.code ? 'rgba(186,143,13,0.08)' : 'var(--surface)',
                                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                    }}>
                                    <div style={{ fontSize: 22, marginBottom: 4 }}>{lang.flag}</div>
                                    <div style={{
                                        fontSize: 13, fontWeight: editLang === lang.code ? 600 : 400,
                                        color: editLang === lang.code ? 'var(--bright-gold)' : 'var(--text-secondary)',
                                    }}>{lang.label}</div>
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {saving ? t('common.saving') : <><Save size={14} /> {t('profile.saveChanges')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoRow({ icon, label, value, color }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: color, flexShrink: 0,
            }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
            </div>
        </div>
    );
}

function MiniStat({ label, value }) {
    return (
        <div style={{
            padding: 14, borderRadius: 12, background: 'var(--surface)',
            border: '1px solid var(--card-border)', textAlign: 'center',
        }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>{label}</div>
        </div>
    );
}

function FieldLabel({ children }) {
    return <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, display: 'block', marginBottom: 8 }}>{children}</label>;
}
