import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, Building2, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [role, setRole] = useState(null); // 'END_USER', 'ADVISOR', 'PARTNER'
    const [name, setName] = useState('');
    const [businessId, setBusinessId] = useState(''); // ARN or GSTIN
    const [income, setIncome] = useState('FROM_25K_TO_50K');
    const [goal, setGoal] = useState('MODERATE');

    // Partner-specific state
    const [partnerData, setPartnerData] = useState({
        legalDocType: '',
        legalDocNumber: '',
        registeredAddr: '',
        regulatoryRegNumber: '',
        complianceOfficerEmail: '',
        complianceOfficerPhone: '',
        technicalContactEmail: '',
        technicalContactPhone: '',
        webhookUrl: '',
        digitalAcceptanceOfTerms: false,
        hasSignedDataProcessAgreement: false,
        hasSignedNoPIIAccess: false,
        hasSignedNoDataResale: false,
        hasSignedBreachReport: false,
        oauthCompatible: false
    });

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
                ...(role === 'ADVISOR' ? { businessId } : {}),
                ...(role === 'PARTNER' ? { ...partnerData } : {})
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
                <h1 style={styles.title}>Welcome to FinSaathi</h1>
                <p style={styles.subtitle}>Let's set up your profile. How are you joining us today?</p>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.roleGrid}>
                    <button
                        style={{ ...styles.roleCard, ...(role === 'END_USER' ? styles.roleCardActive : {}) }}
                        onClick={() => setRole('END_USER')}
                    >
                        <User size={28} color={role === 'END_USER' ? '#d4af35' : 'rgba(255,255,255,0.4)'} />
                        <div style={styles.roleTitle}>Individual Investor</div>
                        <div style={styles.roleDesc}>Manage personal finances & savings</div>
                    </button>

                    <button
                        style={{ ...styles.roleCard, ...(role === 'ADVISOR' ? styles.roleCardActive : {}) }}
                        onClick={() => setRole('ADVISOR')}
                    >
                        <Briefcase size={28} color={role === 'ADVISOR' ? '#d4af35' : 'rgba(255,255,255,0.4)'} />
                        <div style={styles.roleTitle}>Financial Advisor</div>
                        <div style={styles.roleDesc}>Manage clients and offer guidance</div>
                    </button>

                    <button
                        style={{ ...styles.roleCard, ...(role === 'PARTNER' ? styles.roleCardActive : {}) }}
                        onClick={() => setRole('PARTNER')}
                    >
                        <Building2 size={28} color={role === 'PARTNER' ? '#d4af35' : 'rgba(255,255,255,0.4)'} />
                        <div style={styles.roleTitle}>Institutional Partner</div>
                        <div style={styles.roleDesc}>Offer financial products & services</div>
                    </button>
                </div>

                {role && (
                    <form onSubmit={handleSubmit} style={styles.formSection}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Full Name {role === 'PARTNER' && '/ Company Name'}</label>
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
                                    <label style={styles.label}>Monthly Income</label>
                                    <select className="input" value={income} onChange={e => setIncome(e.target.value)} style={styles.select}>
                                        <option value="BELOW_10K">&lt; ₹15,000</option>
                                        <option value="FROM_10K_TO_25K">₹15K - ₹30K</option>
                                        <option value="FROM_25K_TO_50K">₹30K - ₹50K</option>
                                        <option value="FROM_50K_TO_1L">₹50K - ₹1L</option>
                                        <option value="ABOVE_1L">&gt; ₹1 Lakh</option>
                                    </select>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Primary Financial Goal</label>
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
                                <label style={styles.label}>SEBI ARN Number</label>
                                <input
                                    className="input"
                                    value={businessId}
                                    onChange={e => setBusinessId(e.target.value)}
                                    placeholder="e.g. ARN-123456"
                                    required
                                />
                                <div style={styles.helpText}>Required for fast-track approval</div>
                            </div>
                        )}

                        {role === 'PARTNER' && (
                            <>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginTop: 20 }}>
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>1️⃣ Legal Existence (Non-Negotiable)</h3>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>Legal Document Type</label>
                                        <select className="input" value={partnerData.legalDocType} onChange={e => setPartnerData({ ...partnerData, legalDocType: e.target.value })} style={styles.select}>
                                            <option value="">Select Document Type...</option>
                                            <option value="CIN">Corporate Identification Number (CIN)</option>
                                            <option value="NGO_REGISTRATION">NGO Registration Certificate</option>
                                            <option value="PAN">Organization PAN</option>
                                        </select>
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>Legal Document Number</label>
                                        <input className="input" value={partnerData.legalDocNumber} onChange={e => setPartnerData({ ...partnerData, legalDocNumber: e.target.value })} placeholder="e.g. U74999MH..." required />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>Registered Office Address</label>
                                        <textarea className="input" value={partnerData.registeredAddr} onChange={e => setPartnerData({ ...partnerData, registeredAddr: e.target.value })} placeholder="Full legal address..." rows={2} required />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginTop: 20 }}>
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>2️⃣ Regulatory Legitimacy</h3>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>Regulatory Registration ID (RBI / SEBI / NGO Darpan)</label>
                                        <input className="input" value={partnerData.regulatoryRegNumber} onChange={e => setPartnerData({ ...partnerData, regulatoryRegNumber: e.target.value })} placeholder="e.g. SEBI Reg No. INA0000..." required />
                                        <div style={styles.helpText}>Must be independently verifiable on government portals.</div>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginTop: 20 }}>
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>3️⃣ Responsible Person Declaration</h3>

                                    <div style={styles.twoColumnGrid}>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Compliance Email</label>
                                            <input type="email" className="input" value={partnerData.complianceOfficerEmail} onChange={e => setPartnerData({ ...partnerData, complianceOfficerEmail: e.target.value })} placeholder="compliance@domain.com" required />
                                        </div>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Compliance Phone</label>
                                            <input type="tel" className="input" value={partnerData.complianceOfficerPhone} onChange={e => setPartnerData({ ...partnerData, complianceOfficerPhone: e.target.value })} placeholder="+91..." required />
                                        </div>
                                    </div>

                                    <div style={styles.twoColumnGrid}>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Technical Contact Email</label>
                                            <input type="email" className="input" value={partnerData.technicalContactEmail} onChange={e => setPartnerData({ ...partnerData, technicalContactEmail: e.target.value })} placeholder="tech@domain.com" required />
                                        </div>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Technical Contact Phone</label>
                                            <input type="tel" className="input" value={partnerData.technicalContactPhone} onChange={e => setPartnerData({ ...partnerData, technicalContactPhone: e.target.value })} placeholder="+91..." required />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginTop: 20 }}>
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>4️⃣ Mandatory Legal Agreement Signing</h3>

                                    <div style={styles.checkboxGroup}>
                                        <label style={styles.checkboxLabel}>
                                            <input type="checkbox" checked={partnerData.hasSignedDataProcessAgreement} onChange={e => setPartnerData({ ...partnerData, hasSignedDataProcessAgreement: e.target.checked })} required />
                                            <span>I agree to the Data Processing Agreement</span>
                                        </label>
                                        <label style={styles.checkboxLabel}>
                                            <input type="checkbox" checked={partnerData.hasSignedNoPIIAccess} onChange={e => setPartnerData({ ...partnerData, hasSignedNoPIIAccess: e.target.checked })} required />
                                            <span>I agree to the No PII Access Clause</span>
                                        </label>
                                        <label style={styles.checkboxLabel}>
                                            <input type="checkbox" checked={partnerData.hasSignedNoDataResale} onChange={e => setPartnerData({ ...partnerData, hasSignedNoDataResale: e.target.checked })} required />
                                            <span>I agree to the No Data Resale Clause</span>
                                        </label>
                                        <label style={styles.checkboxLabel}>
                                            <input type="checkbox" checked={partnerData.hasSignedBreachReport} onChange={e => setPartnerData({ ...partnerData, hasSignedBreachReport: e.target.checked })} required />
                                            <span>I agree to the Breach Reporting Agreement</span>
                                        </label>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginTop: 20 }}>
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>5️⃣ Basic Technical Readiness</h3>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>Secure Webhook URL (HTTPS)</label>
                                        <input type="url" className="input" value={partnerData.webhookUrl} onChange={e => setPartnerData({ ...partnerData, webhookUrl: e.target.value })} placeholder="https://api.domain.com/webhooks" required />
                                    </div>

                                    <div style={styles.checkboxGroup}>
                                        <label style={styles.checkboxLabel}>
                                            <input type="checkbox" checked={partnerData.oauthCompatible} onChange={e => setPartnerData({ ...partnerData, oauthCompatible: e.target.checked })} required />
                                            <span>We are an OAuth 2.0 compatible system</span>
                                        </label>
                                        <label style={styles.checkboxLabel}>
                                            <input type="checkbox" checked={partnerData.digitalAcceptanceOfTerms} onChange={e => setPartnerData({ ...partnerData, digitalAcceptanceOfTerms: e.target.checked })} required />
                                            <span>I digitally accept all FinSaathi Terms & Conditions</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={
                                !name ||
                                (role === 'ADVISOR' && !businessId) ||
                                (role === 'PARTNER' && (!partnerData.legalDocNumber || !partnerData.regulatoryRegNumber || !partnerData.complianceOfficerEmail || !partnerData.hasSignedDataProcessAgreement)) ||
                                loading
                            }
                            style={{
                                ...styles.submitBtn,
                                opacity: (
                                    !name ||
                                    (role === 'ADVISOR' && !businessId) ||
                                    (role === 'PARTNER' && (!partnerData.legalDocNumber || !partnerData.regulatoryRegNumber || !partnerData.complianceOfficerEmail || !partnerData.hasSignedDataProcessAgreement)) ||
                                    loading
                                ) ? 0.5 : 1
                            }}
                        >
                            {loading ? 'Setting up...' : 'Complete Profile'} <ArrowRight size={18} />
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
