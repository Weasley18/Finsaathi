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
    const [dob, setDob] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [userPanDoc, setUserPanDoc] = useState(null);

    const [businessAddress, setBusinessAddress] = useState('');
    const [professionalEmail, setProfessionalEmail] = useState('');
    const [sebiCertificateIssueDate, setSebiCertificateIssueDate] = useState('');
    const [sebiCertificateExpiryDate, setSebiCertificateExpiryDate] = useState('');
    const [baslMembershipId, setBaslMembershipId] = useState('');
    const [highestQualification, setHighestQualification] = useState('');
    const [optionalCertifications, setOptionalCertifications] = useState([]);
    const [otherCertification, setOtherCertification] = useState('');
    const [languagesSpoken, setLanguagesSpoken] = useState([]);
    const [areasOfExpertise, setAreasOfExpertise] = useState([]);
    const [feeModel, setFeeModel] = useState('FLAT_FEE');

    // Documents
    const [sebiDoc, setSebiDoc] = useState(null);
    const [nismXADoc, setNismXADoc] = useState(null);
    const [nismXBDoc, setNismXBDoc] = useState(null);
    const [panDoc, setPanDoc] = useState(null);
    const [optionalCertificationsDocs, setOptionalCertificationsDocs] = useState({});
    const [partnerDoc, setPartnerDoc] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!role || !name) return;
        setLoading(true);
        setError('');

        if (role === 'END_USER') {
            if (!dob) {
                setError('Date of Birth is required.');
                setLoading(false);
                return;
            }
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 18) {
                setError('You must be at least 18 years old to create an account.');
                setLoading(false);
                return;
            }
            if (!panNumber || !userPanDoc) {
                setError('PAN Number and PAN Document are required.');
                setLoading(false);
                return;
            }
        }

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

                for (const cert of optionalCertifications) {
                    const certKey = cert === 'Other' && otherCertification ? otherCertification : cert;
                    const doc = optionalCertificationsDocs[cert];
                    if (doc) {
                        await api.uploadDocument(doc, `optional_cert_${certKey.replace(/[^a-zA-Z0-9]/g, '_')}`);
                    }
                }
            }

            // Upload partner document if Partner
            if (role === 'PARTNER' && partnerDoc) {
                await api.uploadDocument(partnerDoc, 'partner_legal_doc');
            }

            if (role === 'END_USER' && userPanDoc) {
                await api.uploadDocument(userPanDoc, 'user_pan');
            }

            const payload = {
                name,
                role,
                ...(role === 'END_USER' ? {
                    incomeRange: income,
                    riskProfile: goal,
                    areasOfInterest,
                    dob,
                    panNumber
                } : {}),
                ...((role === 'ADVISOR' || role === 'PARTNER') ? { businessId } : {}),
                ...(role === 'ADVISOR' ? {
                    businessAddress,
                    professionalEmail,
                    sebiCertificateIssueDate,
                    sebiCertificateExpiryDate,
                    baslMembershipId,
                    highestQualification,
                    optionalCertifications: optionalCertifications.map(c => c === 'Other' && otherCertification ? otherCertification : c),
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
                                    <label style={styles.label}>Date of Birth</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={dob}
                                        onChange={e => setDob(e.target.value)}
                                        required
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>PAN Number</label>
                                    <input
                                        className="input"
                                        value={panNumber}
                                        onChange={e => setPanNumber(e.target.value.toUpperCase())}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        required
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Upload PAN Card Document</label>
                                    <input
                                        type="file"
                                        className="input"
                                        onChange={e => setUserPanDoc(e.target.files[0])}
                                        required
                                        style={{ padding: '8px' }}
                                    />
                                </div>
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
                                    <label style={styles.label}>Areas of Interest</label>
                                    <div style={styles.checkboxGroup}>
                                        {[
                                            { value: 'Micro-savings', label: 'Micro-savings' },
                                            { value: 'Debt Management', label: 'Debt Management' },
                                            { value: 'Gig-Worker Financial Planning', label: 'Gig-Worker Financial Planning' },
                                            { value: 'Rural Microfinance', label: 'Rural Microfinance' },
                                            { value: 'Retirement Planning', label: 'Retirement Planning' }
                                        ].map(opt => (
                                            <label key={opt.value} style={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={areasOfInterest.includes(opt.value)}
                                                    onChange={e => {
                                                        if (e.target.checked) setAreasOfInterest([...areasOfInterest, opt.value]);
                                                        else setAreasOfInterest(areasOfInterest.filter(v => v !== opt.value));
                                                    }}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div style={styles.helpText}>Select multiple. This helps us match you with the right advisor.</div>
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
                                    <div style={styles.checkboxGroup}>
                                        {[
                                            { value: 'NISM-Series-V-A', label: 'NISM-Series-V-A: Mutual Fund' },
                                            { value: 'NISM-Series-XVII', label: 'NISM-Series-XVII: Retirement' },
                                            { value: 'NISM-Series-XV', label: 'NISM-Series-XV: Research Analyst' },
                                            { value: 'Other', label: 'Other (Please specify)' }
                                        ].map(opt => (
                                            <label key={opt.value} style={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={optionalCertifications.includes(opt.value)}
                                                    onChange={e => {
                                                        const isChecked = e.target.checked;
                                                        if (isChecked) {
                                                            setOptionalCertifications([...optionalCertifications, opt.value]);
                                                        } else {
                                                            setOptionalCertifications(optionalCertifications.filter(v => v !== opt.value));
                                                            const newDocs = { ...optionalCertificationsDocs };
                                                            delete newDocs[opt.value];
                                                            setOptionalCertificationsDocs(newDocs);
                                                        }
                                                    }}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div style={styles.helpText}>Select multiple if applicable.</div>
                                    {optionalCertifications.includes('Other') && (
                                        <div style={{ marginTop: 12 }}>
                                            <input className="input" value={otherCertification} onChange={e => setOtherCertification(e.target.value)} placeholder="Enter certification name" required />
                                        </div>
                                    )}
                                    {optionalCertifications.length > 0 && (
                                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <h4 style={{ ...styles.label, marginTop: 8, marginBottom: 4, color: '#d4af35' }}>Upload Selected Optional Certifications</h4>
                                            {optionalCertifications.map(cert => {
                                                const displayLabel = cert === 'Other' ? (otherCertification || 'Other Certification') : cert;
                                                return (
                                                    <div key={cert} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <label style={{ ...styles.label, textTransform: 'none' }}>{displayLabel}</label>
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.png,.jpg,.jpeg"
                                                            onChange={e => setOptionalCertificationsDocs({ ...optionalCertificationsDocs, [cert]: e.target.files[0] })}
                                                            style={styles.fileInput}
                                                            required
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <h3 style={styles.sectionTitle}>Platform Profiling</h3>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Languages Spoken</label>
                                    <div style={styles.checkboxGroup}>
                                        {[
                                            { value: 'English', label: 'English' },
                                            { value: 'Hindi', label: 'Hindi' },
                                            { value: 'Marathi', label: 'Marathi' },
                                            { value: 'Gujarati', label: 'Gujarati' },
                                            { value: 'Tamil', label: 'Tamil' }
                                        ].map(opt => (
                                            <label key={opt.value} style={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={languagesSpoken.includes(opt.value)}
                                                    onChange={e => {
                                                        if (e.target.checked) setLanguagesSpoken([...languagesSpoken, opt.value]);
                                                        else setLanguagesSpoken(languagesSpoken.filter(v => v !== opt.value));
                                                    }}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div style={styles.helpText}>Select all regional languages you support.</div>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Areas of Expertise</label>
                                    <div style={styles.checkboxGroup}>
                                        {[
                                            { value: 'Micro-savings', label: 'Micro-savings' },
                                            { value: 'Debt Management', label: 'Debt Management' },
                                            { value: 'Gig-Worker Financial Planning', label: 'Gig-Worker Financial Planning' },
                                            { value: 'Rural Microfinance', label: 'Rural Microfinance' },
                                            { value: 'Retirement Planning', label: 'Retirement Planning' }
                                        ].map(opt => (
                                            <label key={opt.value} style={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={areasOfExpertise.includes(opt.value)}
                                                    onChange={e => {
                                                        if (e.target.checked) setAreasOfExpertise([...areasOfExpertise, opt.value]);
                                                        else setAreasOfExpertise(areasOfExpertise.filter(v => v !== opt.value));
                                                    }}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
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
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>Legal Existence (Non-Negotiable)</h3>

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
                                        <label style={styles.label}>Upload Legal Document</label>
                                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setPartnerDoc(e.target.files[0])} style={styles.fileInput} required />
                                        <div style={styles.helpText}>Please upload a clear copy of the selected legal document.</div>
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>Registered Office Address</label>
                                        <textarea className="input" value={partnerData.registeredAddr} onChange={e => setPartnerData({ ...partnerData, registeredAddr: e.target.value })} placeholder="Full legal address..." rows={2} required />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginTop: 20 }}>
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>Regulatory Legitimacy</h3>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>Regulatory Registration ID (RBI / SEBI / NGO Darpan)</label>
                                        <input className="input" value={partnerData.regulatoryRegNumber} onChange={e => setPartnerData({ ...partnerData, regulatoryRegNumber: e.target.value })} placeholder="e.g. SEBI Reg No. INA0000..." required />
                                        <div style={styles.helpText}>Must be independently verifiable on government portals.</div>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginTop: 20 }}>
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>Responsible Person Declaration</h3>

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
                                    <h3 style={{ color: '#d4af35', fontSize: 16, marginBottom: 16 }}>Mandatory Legal Agreement Signing</h3>

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
                                (role === 'ADVISOR' && (!businessId || (optionalCertifications.length > 0 && optionalCertifications.some(c => !optionalCertificationsDocs[c])))) ||
                                (role === 'PARTNER' && (!businessId || !partnerData.legalDocNumber || !partnerDoc || !partnerData.regulatoryRegNumber || !partnerData.complianceOfficerEmail || !partnerData.hasSignedDataProcessAgreement)) ||
                                loading
                            }
                            style={{
                                ...styles.submitBtn,
                                opacity: (
                                    !name ||
                                    (role === 'ADVISOR' && (!businessId || (optionalCertifications.length > 0 && optionalCertifications.some(c => !optionalCertificationsDocs[c])))) ||
                                    (role === 'PARTNER' && (!businessId || !partnerData.legalDocNumber || !partnerDoc || !partnerData.regulatoryRegNumber || !partnerData.complianceOfficerEmail || !partnerData.hasSignedDataProcessAgreement)) ||
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