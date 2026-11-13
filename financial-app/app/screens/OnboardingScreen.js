import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Briefcase, Building2, ArrowRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import useAuthStore from '../store/authStore';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import api from '../services/api';
import { Colors } from '../theme';

const { width } = Dimensions.get('window');

const INCOME_RANGES = [
    { label: '< ₹15,000', value: 'BELOW_10K' },
    { label: '₹15K - ₹30K', value: 'FROM_10K_TO_25K' },
    { label: '₹30K - ₹50K', value: 'FROM_25K_TO_50K' },
    { label: '₹50K - ₹1L', value: 'FROM_50K_TO_1L' },
    { label: '> ₹1 Lakh', value: 'ABOVE_1L' },
];

const GOALS = [
    { label: 'Capital Preservation (Safe)', value: 'CONSERVATIVE' },
    { label: 'Balanced Growth', value: 'MODERATE' },
    { label: 'Aggressive Wealth Creation', value: 'AGGRESSIVE' },
];

const CheckboxItem = ({ label, isChecked, onToggle }) => (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }} onPress={onToggle}>
        <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: isChecked ? '#d4af35' : '#666', borderRadius: 4, marginRight: 10, backgroundColor: isChecked ? '#d4af35' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {isChecked && <View style={{ width: 10, height: 10, backgroundColor: 'black', borderRadius: 2 }} />}
        </View>
        <Text style={{ color: 'white', flex: 1, fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
);

const FileUploadBtn = ({ label, onFileSelect, file }) => (
    <View style={{ marginBottom: 16 }}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={{ padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: file ? '#d4af35' : 'rgba(255,255,255,0.2)' }} onPress={() => pickDocument(onFileSelect)}>
            <Text style={{ color: file ? '#d4af35' : 'rgba(255,255,255,0.5)' }}>{file ? `Selected: ${file.name}` : 'Tap to select file'}</Text>
        </TouchableOpacity>
    </View>
);

const pickDocument = async (setDoc) => {
    try {
        let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (!result.canceled) {
            setDoc(result.assets[0]);
        }
    } catch (err) {
        console.warn(err);
    }
};

export default function OnboardingScreen({ navigation }) {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [role, setRole] = useState(null); // 'END_USER', 'ADVISOR', 'PARTNER'
    const [name, setName] = useState('');
    const [businessId, setBusinessId] = useState(''); // ARN or GSTIN

    // User
    const [dob, setDob] = useState('');
    const [income, setIncome] = useState('FROM_25K_TO_50K');
    const [goal, setGoal] = useState('MODERATE');
    const [areasOfInterest, setAreasOfInterest] = useState([]);

    // Advisor Fields
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

    // Partner Fields
    const [partnerData, setPartnerData] = useState({
        legalDocType: '',
        legalDocNumber: '',
        registeredAddr: '',
        regulatoryRegNumber: '',
        complianceOfficerEmail: '',
        complianceOfficerPhone: '',
        technicalContactEmail: '',
        technicalContactPhone: '',
        digitalAcceptanceOfTerms: false,
        hasSignedDataProcessAgreement: false,
        hasSignedNoPIIAccess: false,
        hasSignedNoDataResale: false,
        hasSignedBreachReport: false
    });

    // Documents
    const [sebiDoc, setSebiDoc] = useState(null);
    const [nismXADoc, setNismXADoc] = useState(null);
    const [nismXBDoc, setNismXBDoc] = useState(null);
    const [panDoc, setPanDoc] = useState(null);
    const [optionalCertificationsDocs, setOptionalCertificationsDocs] = useState({});
    const [partnerDoc, setPartnerDoc] = useState(null);

    const [saving, setSaving] = useState(false);
    const { completeProfile, logout } = useAuthStore();

    useEffect(() => {
        const onBackPress = () => {
            if (step === 2) {
                setStep(1);
                return true; // Prevent default
            } else {
                // At step 1, log out and go to Login screen
                logout();
                navigation.replace('Login');
                return true; // Prevent default
            }
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [step, navigation, logout]);

    const handleNextStep = () => {
        if (!role) return;
        setStep(2);
    };

    const handleComplete = async () => {
        if (!name) {
            Alert.alert('Required', 'Please enter your name.');
            return;
        }

        if (role === 'END_USER') {
            if (!dob) {
                Alert.alert('Required', 'Please enter your Date of Birth.');
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
                Alert.alert('Age Restriction', 'You must be at least 18 years old to create an account.');
                return;
            }
        }

        setSaving(true);
        try {
            // Document uploads logic mapped from web app
            if (role === 'ADVISOR') {
                if (!sebiDoc || !nismXADoc || !nismXBDoc || !panDoc) {
                    Alert.alert('Missing Documents', 'Please upload all mandatory documents for Advisor.');
                    setSaving(false);
                    return;
                }
                // Upload documents
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

            if (role === 'PARTNER' && partnerDoc) {
                await api.uploadDocument(partnerDoc, 'partner_legal_doc');
            }

            const payload = {
                name,
                language: 'en',
                role,
                ...(role === 'END_USER' ? {
                    incomeRange: income,
                    riskProfile: goal,
                    areasOfInterest,
                    dob
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

            await completeProfile(payload);

            if (role === 'ADVISOR' || role === 'PARTNER') {
                navigation.replace('WaitingRoom');
            } else {
                navigation.replace('Dashboard');
            }
        } catch (error) {
            console.error('Profile setup error:', error);
            Alert.alert('Error', 'Failed to save your profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderRoleSelection = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.title}>Join FinSaathi</Text>
            <Text style={styles.subtitle}>Select how you want to use the platform.</Text>

            <TouchableOpacity style={[styles.roleCard, role === 'END_USER' && styles.roleCardActive]} onPress={() => setRole('END_USER')}>
                <View style={[styles.iconBox, role === 'END_USER' && styles.iconBoxActive]}>
                    <User size={28} color={role === 'END_USER' ? '#d4af35' : '#888'} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={[styles.roleTitle, role === 'END_USER' && styles.textActive]}>Individual Investor</Text>
                    <Text style={styles.roleDesc}>Manage personal finances, goals & savings.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.roleCard, role === 'ADVISOR' && styles.roleCardActive]} onPress={() => setRole('ADVISOR')}>
                <View style={[styles.iconBox, role === 'ADVISOR' && styles.iconBoxActive]}>
                    <Briefcase size={28} color={role === 'ADVISOR' ? '#d4af35' : '#888'} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={[styles.roleTitle, role === 'ADVISOR' && styles.textActive]}>Financial Advisor</Text>
                    <Text style={styles.roleDesc}>Manage clients, get AI assistance, and grow.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.roleCard, role === 'PARTNER' && styles.roleCardActive]} onPress={() => setRole('PARTNER')}>
                <View style={[styles.iconBox, role === 'PARTNER' && styles.iconBoxActive]}>
                    <Building2 size={28} color={role === 'PARTNER' ? '#d4af35' : '#888'} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={[styles.roleTitle, role === 'PARTNER' && styles.textActive]}>Institutional Partner</Text>
                    <Text style={styles.roleDesc}>Offer financial products to massive audiences.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.mainBtn, !role && styles.mainBtnDisabled]} disabled={!role} onPress={handleNextStep}>
                <Text style={styles.mainBtnText}>{t('common.continue')}</Text>
                <ArrowRight size={20} color={role ? "black" : "#666"} />
            </TouchableOpacity>
        </View>
    );

    const renderDetailsForm = () => (
        <View style={styles.stepContainer}>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Your Details</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>{role === 'PARTNER' ? 'Company Name' : 'Full Name'}</Text>
                <TextInput style={styles.input} placeholder={role === 'PARTNER' ? "Acme Financials" : "Rahul Sharma"} placeholderTextColor="rgba(255,255,255,0.3)" value={name} onChangeText={setName} />
            </View>

            {role === 'END_USER' && (
                <>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth</Text>
                        <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Monthly Income</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                            {INCOME_RANGES.map((r, i) => (
                                <TouchableOpacity key={i} style={[styles.chip, income === r.value && styles.chipActive]} onPress={() => setIncome(r.value)}>
                                    <Text style={[styles.chipText, income === r.value && styles.chipTextActive]}>{r.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Primary Goal</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                            {GOALS.map((g, i) => (
                                <TouchableOpacity key={i} style={[styles.chip, goal === g.value && styles.chipActive]} onPress={() => setGoal(g.value)}>
                                    <Text style={[styles.chipText, goal === g.value && styles.chipTextActive]}>{g.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Areas of Interest</Text>
                        {[
                            { value: 'Micro-savings', label: 'Micro-savings' },
                            { value: 'Debt Management', label: 'Debt Management' },
                            { value: 'Gig-Worker Financial Planning', label: 'Gig-Worker Financial Planning' },
                            { value: 'Rural Microfinance', label: 'Rural Microfinance' },
                            { value: 'Retirement Planning', label: 'Retirement Planning' }
                        ].map(opt => (
                            <CheckboxItem
                                key={opt.value}
                                label={opt.label}
                                isChecked={areasOfInterest.includes(opt.value)}
                                onToggle={() => setAreasOfInterest(prev => prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                            />
                        ))}
                    </View>
                </>
            )}

            {role === 'ADVISOR' && (
                <>
                    <Text style={styles.sectionTitle}>Basic Identity & Contact</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>SEBI Registration Number (ARN)</Text>
                        <TextInput style={styles.input} value={businessId} onChangeText={setBusinessId} placeholder="e.g. INA00000XXXX" placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Professional Email</Text>
                        <TextInput style={styles.input} value={professionalEmail} onChangeText={setProfessionalEmail} placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Registered Business Address</Text>
                        <TextInput style={styles.input} value={businessAddress} onChangeText={setBusinessAddress} multiline placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>
                    <Text style={styles.sectionTitle}>Regulatory & Compliance</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Certificate Issue Date</Text>
                        <TextInput style={styles.input} value={sebiCertificateIssueDate} onChangeText={setSebiCertificateIssueDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Certificate Expiry Date</Text>
                        <TextInput style={styles.input} value={sebiCertificateExpiryDate} onChangeText={setSebiCertificateExpiryDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>BASL Membership ID</Text>
                        <TextInput style={styles.input} value={baslMembershipId} onChangeText={setBaslMembershipId} placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>
                    <Text style={styles.sectionTitle}>Educational & Certification</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Highest Educational Qualification</Text>
                        <TextInput style={styles.input} value={highestQualification} onChangeText={setHighestQualification} placeholder="e.g. MBA Finance" placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Optional Certifications</Text>
                        {[
                            { value: 'NISM-Series-V-A', label: 'NISM-Series-V-A: Mutual Fund' },
                            { value: 'NISM-Series-XVII', label: 'NISM-Series-XVII: Retirement' },
                            { value: 'NISM-Series-XV', label: 'NISM-Series-XV: Research Analyst' },
                            { value: 'Other', label: 'Other (Please specify)' }
                        ].map(opt => (
                            <CheckboxItem
                                key={opt.value}
                                label={opt.label}
                                isChecked={optionalCertifications.includes(opt.value)}
                                onToggle={() => {
                                    const isChecked = !optionalCertifications.includes(opt.value);
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
                        ))}
                    </View>

                    {optionalCertifications.includes('Other') && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Specify Other Certification</Text>
                            <TextInput style={styles.input} value={otherCertification} onChangeText={setOtherCertification} placeholderTextColor="rgba(255,255,255,0.3)" />
                        </View>
                    )}

                    {optionalCertifications.length > 0 && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.sectionTitle}>Upload Selected Optional Certifications</Text>
                            {optionalCertifications.map(cert => {
                                const displayLabel = cert === 'Other' ? (otherCertification || 'Other Certification') : cert;
                                return (
                                    <FileUploadBtn
                                        key={cert}
                                        label={displayLabel}
                                        file={optionalCertificationsDocs[cert]}
                                        onFileSelect={doc => setOptionalCertificationsDocs({ ...optionalCertificationsDocs, [cert]: doc })}
                                    />
                                );
                            })}
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>Platform Profiling</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Languages Spoken</Text>
                        {[
                            { value: 'English', label: 'English' },
                            { value: 'Hindi', label: 'Hindi' },
                            { value: 'Marathi', label: 'Marathi' },
                            { value: 'Gujarati', label: 'Gujarati' },
                            { value: 'Tamil', label: 'Tamil' }
                        ].map(opt => (
                            <CheckboxItem key={opt.value} label={opt.label} isChecked={languagesSpoken.includes(opt.value)} onToggle={() => setLanguagesSpoken(prev => prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value])} />
                        ))}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Areas of Expertise</Text>
                        {[
                            { value: 'Micro-savings', label: 'Micro-savings' },
                            { value: 'Debt Management', label: 'Debt Management' },
                            { value: 'Gig-Worker Financial Planning', label: 'Gig-Worker Financial Planning' },
                            { value: 'Rural Microfinance', label: 'Rural Microfinance' },
                            { value: 'Retirement Planning', label: 'Retirement Planning' }
                        ].map(opt => (
                            <CheckboxItem key={opt.value} label={opt.label} isChecked={areasOfExpertise.includes(opt.value)} onToggle={() => setAreasOfExpertise(prev => prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value])} />
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Mandatory Document Uploads</Text>
                    <FileUploadBtn label="SEBI Registration Certificate" file={sebiDoc} onFileSelect={setSebiDoc} />
                    <FileUploadBtn label="NISM Series X-A Certificate" file={nismXADoc} onFileSelect={setNismXADoc} />
                    <FileUploadBtn label="NISM Series X-B Certificate" file={nismXBDoc} onFileSelect={setNismXBDoc} />
                    <FileUploadBtn label="PAN Card" file={panDoc} onFileSelect={setPanDoc} />

                </>
            )}

            {role === 'PARTNER' && (
                <>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>GSTIN / Business ID</Text>
                        <TextInput style={styles.input} value={businessId} onChangeText={setBusinessId} autoCapitalize="characters" placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>

                    <Text style={styles.sectionTitle}>Legal Existence (Non-Negotiable)</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Legal Document Number</Text>
                        <TextInput style={styles.input} value={partnerData.legalDocNumber} onChangeText={v => setPartnerData({ ...partnerData, legalDocNumber: v })} placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>
                    <FileUploadBtn label="Upload Legal Document" file={partnerDoc} onFileSelect={setPartnerDoc} />
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Registered Office Address</Text>
                        <TextInput style={styles.input} value={partnerData.registeredAddr} onChangeText={v => setPartnerData({ ...partnerData, registeredAddr: v })} multiline placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>

                    <Text style={styles.sectionTitle}>Regulatory Legitimacy</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Regulatory Registration ID</Text>
                        <TextInput style={styles.input} value={partnerData.regulatoryRegNumber} onChangeText={v => setPartnerData({ ...partnerData, regulatoryRegNumber: v })} placeholderTextColor="rgba(255,255,255,0.3)" />
                    </View>

                    <Text style={styles.sectionTitle}>Responsible Person Declaration</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Compliance Email</Text>
                        <TextInput style={styles.input} value={partnerData.complianceOfficerEmail} onChangeText={v => setPartnerData({ ...partnerData, complianceOfficerEmail: v })} placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="email-address" />
                    </View>

                    <Text style={styles.sectionTitle}>Mandatory Legal Agreement Signing</Text>
                    <CheckboxItem label="I agree to the Data Processing Agreement" isChecked={partnerData.hasSignedDataProcessAgreement} onToggle={() => setPartnerData(p => ({ ...p, hasSignedDataProcessAgreement: !p.hasSignedDataProcessAgreement }))} />
                    <CheckboxItem label="I agree to the No PII Access Clause" isChecked={partnerData.hasSignedNoPIIAccess} onToggle={() => setPartnerData(p => ({ ...p, hasSignedNoPIIAccess: !p.hasSignedNoPIIAccess }))} />
                    <CheckboxItem label="I agree to the No Data Resale Clause" isChecked={partnerData.hasSignedNoDataResale} onToggle={() => setPartnerData(p => ({ ...p, hasSignedNoDataResale: !p.hasSignedNoDataResale }))} />
                    <CheckboxItem label="I agree to the Breach Reporting Agreement" isChecked={partnerData.hasSignedBreachReport} onToggle={() => setPartnerData(p => ({ ...p, hasSignedBreachReport: !p.hasSignedBreachReport }))} />
                    <CheckboxItem label="I digitally accept all FinSaathi Terms & Conditions" isChecked={partnerData.digitalAcceptanceOfTerms} onToggle={() => setPartnerData(p => ({ ...p, digitalAcceptanceOfTerms: !p.digitalAcceptanceOfTerms }))} />
                </>
            )}

            <TouchableOpacity
                style={[styles.mainBtn, saving && styles.mainBtnDisabled, { marginTop: 20 }]}
                disabled={saving || !name || (role === 'ADVISOR' && !businessId) || (role === 'PARTNER' && !businessId)}
                onPress={handleComplete}
            >
                {saving ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <>
                        <Text style={styles.mainBtnText}>Complete Setup</Text>
                        <ArrowRight size={20} color="black" />
                    </>
                )}
            </TouchableOpacity>
            <View style={{ height: 100 }} />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0d0d0d', '#1a1a1a']} style={styles.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {step === 1 ? renderRoleSelection() : renderDetailsForm()}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0d0d0d' },
    background: { ...StyleSheet.absoluteFillObject },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 40 },
    stepContainer: { flex: 1, justifyContent: 'center' },
    backBtn: { alignSelf: 'flex-start', marginBottom: 20, paddingVertical: 8 },
    backBtnText: { color: '#d4af35', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 32, fontWeight: 'bold', color: '#d4af35', marginBottom: 8 },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#d4af35', marginTop: 20, marginBottom: 12 },

    // Role Cards
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    roleCardActive: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderColor: '#d4af35',
    },
    iconBox: {
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16,
    },
    iconBoxActive: { backgroundColor: 'rgba(212, 175, 55, 0.2)' },
    roleInfo: { flex: 1 },
    roleTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 4 },
    textActive: { color: '#d4af35' },
    roleDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

    // Button
    mainBtn: {
        backgroundColor: '#d4af35',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        marginTop: 24,
        gap: 8,
    },
    mainBtnDisabled: { backgroundColor: '#333' },
    mainBtnText: { color: 'black', fontSize: 18, fontWeight: '700' },

    // Form
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12, padding: 16, color: 'white', fontSize: 16,
    },
    chipsContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 4,
    },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    },
    chipActive: { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: '#d4af35' },
    chipText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
    chipTextActive: { color: '#d4af35', fontWeight: 'bold' },
});
