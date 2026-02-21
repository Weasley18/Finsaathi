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
    const [areasOfInterest, setAreasOfInterest] = useState([]); // FOR END USER

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

    // Advisor Fields
    const [businessAddress, setBusinessAddress] = useState('');
    const [professionalEmail, setProfessionalEmail] = useState('');
    const [sebiCertificateIssueDate, setSebiCertificateIssueDate] = useState('');
    const [sebiCertificateExpiryDate, setSebiCertificateExpiryDate] = useState('');
    const [baslMembershipId, setBaslMembershipId] = useState('');
    const [highestQualification, setHighestQualification] = useState('');
    const [optionalCertifications, setOptionalCertifications] = useState([]);
    const [languagesSpoken, setLanguagesSpoken] = useState([]);
    const [areasOfExpertise, setAreasOfExpertise] = useState([]);
    const [feeModel, setFeeModel] = useState('FLAT_FEE');

    // Documents
    const [sebiDoc, setSebiDoc] = useState(null);
    const [nismXADoc, setNismXADoc] = useState(null);
    const [nismXBDoc, setNismXBDoc] = useState(null);
    const [panDoc, setPanDoc] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!role || !name) return;
        setLoading(true);
        setError('');

        try {
            // Upload documents first if Advisor
            if (role === 'ADVISOR') {
                if (!sebiDoc || !nismXADoc || !nismXBDoc || !panDoc) {
                    setError('Please upload all mandatory documents.');
                    setLoading(false);
                    return;
                }
                await api.uploadDocument(sebiDoc, 'sebi_certificate');
                await api.uploadDocument(nismXADoc, 'nism_xa');
                await api.uploadDocument(nismXBDoc, 'nism_xb');
                await api.uploadDocument(panDoc, 'pan');
            }

            const payload = {
                name,
                role,
                ...(role === 'END_USER' ? {
                    incomeRange: income,
                    riskProfile: goal,
                    areasOfInterest
                } : {}),
                ...((role === 'ADVISOR' || role === 'PARTNER') ? { businessId } : {}),
                ...(role === 'ADVISOR' ? {
                    businessAddress,
                    professionalEmail,
                    sebiCertificateIssueDate,
                    sebiCertificateExpiryDate,
                    baslMembershipId,
                    highestQualification,
                    optionalCertifications,
                    languagesSpoken,
                    areasOfExpertise,
                    feeModel
                } : {}),
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
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Areas of Interest (Select multiple)</label>
                                    <select multiple className="input" value={areasOfInterest} onChange={e => setAreasOfInterest(Array.from(e.target.selectedOptions, option => option.value))} style={{ ...styles.select, height: '100px' }}>
                                        <option value="Micro-savings">Micro-savings</option>
                                        <option value="Debt Management">Debt Management</option>
                                        <option value="Gig-Worker Financial Planning">Gig-Worker Financial Planning</option>
                                        <option value="Rural Microfinance">Rural Microfinance</option>
                                        <option value="Retirement Planning">Retirement Planning</option>
                                    </select>
                                    <div style={styles.helpText}>Hold Ctrl/Cmd to select multiple. This helps us match you with the right advisor.</div>
                                </div>
                            </>
                        )}

                        {role === 'ADVISOR' && (
                            <>
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
                                <h3 style={styles.sectionTitle}>Basic Identity & Contact</h3>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Professional Email</label>
                                    <input type="email" className="input" value={professionalEmail} onChange={e => setProfessionalEmail(e.target.value)} required />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Registered Business Address</label>
                                    <textarea className="input" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} required rows={2} />
                                </div>

                                <h3 style={styles.sectionTitle}>Regulatory & Compliance</h3>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>SEBI Registration Number (ARN)</label>
                                    <input
                                        className="input"
                                        value={businessId}
                                        onChange={e => setBusinessId(e.target.value)}
                                        placeholder="e.g. INA00000XXXX"
                                        required
                                    />
                                </div>
                                <div style={styles.row}>
                                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                                        <label style={styles.label}>Certificate Issue Date</label>
                                        <input type="date" className="input" value={sebiCertificateIssueDate} onChange={e => setSebiCertificateIssueDate(e.target.value)} required />
                                    </div>
                                    <div style={{ ...styles.inputGroup, flex: 1, marginLeft: 16 }}>
                                        <label style={styles.label}>Certificate Expiry Date</label>
                                        <input type="date" className="input" value={sebiCertificateExpiryDate} onChange={e => setSebiCertificateExpiryDate(e.target.value)} required />
                                    </div>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>BASL Membership ID</label>
                                    <input className="input" value={baslMembershipId} onChange={e => setBaslMembershipId(e.target.value)} required />
                                </div>

                                <h3 style={styles.sectionTitle}>Educational & Certification</h3>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Highest Educational Qualification</label>
                                    <input className="input" value={highestQualification} onChange={e => setHighestQualification(e.target.value)} placeholder="e.g. MBA Finance, ABC University, 2015" required />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Optional Certifications</label>
                                    <select multiple className="input" value={optionalCertifications} onChange={e => setOptionalCertifications(Array.from(e.target.selectedOptions, option => option.value))} style={{ ...styles.select, height: '80px' }}>
                                        <option value="NISM-Series-V-A">NISM-Series-V-A: Mutual Fund</option>
                                        <option value="NISM-Series-XVII">NISM-Series-XVII: Retirement</option>
                                        <option value="NISM-Series-XV">NISM-Series-XV: Research Analyst</option>
                                    </select>
                                    <div style={styles.helpText}>Hold Ctrl/Cmd to select multiple.</div>
                                </div>

                                <h3 style={styles.sectionTitle}>Platform Profiling</h3>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Languages Spoken</label>
                                    <select multiple className="input" value={languagesSpoken} onChange={e => setLanguagesSpoken(Array.from(e.target.selectedOptions, option => option.value))} style={{ ...styles.select, height: '80px' }}>
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Marathi">Marathi</option>
                                        <option value="Gujarati">Gujarati</option>
                                        <option value="Tamil">Tamil</option>
                                    </select>
                                    <div style={styles.helpText}>Select all regional languages you support.</div>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Areas of Expertise</label>
                                    <select multiple className="input" value={areasOfExpertise} onChange={e => setAreasOfExpertise(Array.from(e.target.selectedOptions, option => option.value))} style={{ ...styles.select, height: '100px' }} required>
                                        <option value="Micro-savings">Micro-savings</option>
                                        <option value="Debt Management">Debt Management</option>
                                        <option value="Gig-Worker Financial Planning">Gig-Worker Financial Planning</option>
                                        <option value="Rural Microfinance">Rural Microfinance</option>
                                        <option value="Retirement Planning">Retirement Planning</option>
                                    </select>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Advisory Fee Model</label>
                                    <select className="input" value={feeModel} onChange={e => setFeeModel(e.target.value)} style={styles.select} required>
                                        <option value="FLAT_FEE">Flat Fee</option>
                                        <option value="NGO_SUBSIDIZED">NGO Subsidized</option>
                                        <option value="CSR_FUNDED">CSR Funded</option>
                                        <option value="B2B_SPONSORED">B2B Sponsored</option>
                                    </select>
                                </div>

                                <h3 style={styles.sectionTitle}>Mandatory Document Uploads (PDF)</h3>
                                <div style={styles.row}>
                                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                                        <label style={styles.label}>SEBI Registration Certificate</label>
                                        <input type="file" accept=".pdf" onChange={e => setSebiDoc(e.target.files[0])} style={styles.fileInput} required />
                                    </div>
                                    <div style={{ ...styles.inputGroup, flex: 1, marginLeft: 16 }}>
                                        <label style={styles.label}>PAN Card</label>
                                        <input type="file" accept=".pdf" onChange={e => setPanDoc(e.target.files[0])} style={styles.fileInput} required />
                                    </div>
                                </div>
                                <div style={styles.row}>
                                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                                        <label style={styles.label}>NISM Series X-A</label>
                                        <input type="file" accept=".pdf" onChange={e => setNismXADoc(e.target.files[0])} style={styles.fileInput} required />
                                    </div>
                                    <div style={{ ...styles.inputGroup, flex: 1, marginLeft: 16 }}>
                                        <label style={styles.label}>NISM Series X-B</label>
                                        <input type="file" accept=".pdf" onChange={e => setNismXBDoc(e.target.files[0])} style={styles.fileInput} required />
                                    </div>
                                </div>
                            </>
                        )}

                        {role === 'PARTNER' && (
                            <>
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
                                (role === 'PARTNER' && (!businessId || !partnerData.legalDocNumber || !partnerData.regulatoryRegNumber || !partnerData.complianceOfficerEmail || !partnerData.hasSignedDataProcessAgreement)) ||
                                loading
                            }
                            style={{
                                ...styles.submitBtn,
                                opacity: (
                                    !name ||
                                    (role === 'ADVISOR' && !businessId) ||
                                    (role === 'PARTNER' && (!businessId || !partnerData.legalDocNumber || !partnerData.regulatoryRegNumber || !partnerData.complianceOfficerEmail || !partnerData.hasSignedDataProcessAgreement)) ||
                                    loading
                                ) ? 0.5 : 1
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
        maxHeight: '60vh',
        overflowY: 'auto',
        paddingRight: '12px',
    },
    sectionTitle: {
        color: '#d4af35',
        fontSize: '16px',
        marginTop: '24px',
        marginBottom: '16px',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
        paddingBottom: '8px'
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%'
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
    fileInput: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: '14px',
        width: '100%',
        padding: '10px 0'
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
    },
    twoColumnGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
    },
    checkboxGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '14px',
        cursor: 'pointer'
    }
};