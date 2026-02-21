import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Phone, Shield, ArrowRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import useAuthStore from '../store/authStore';
import { colors, gradients, glassmorphism } from '../theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const [step, setStep] = useState('phone'); // 'phone' | 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const { sendOtp, verifyOtp, isLoading } = useAuthStore();

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        ]).start();
    }, [step]);

    const handleSendOtp = async () => {
        if (phone.length < 10) {
            Alert.alert('Invalid', 'Please enter a valid 10-digit phone number.');
            return;
        }
        try {
            const result = await sendOtp(phone);
            if (result?.otp) {
                Alert.alert('Dev Mode', `Your OTP is: ${result.otp}`);
            }
            setStep('otp');
        } catch (error) {
            Alert.alert('Error', 'Failed to send OTP. Make sure the backend is running.');
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            Alert.alert('Invalid', 'Please enter the 6-digit OTP.');
            return;
        }
        try {
            const result = await verifyOtp(phone, otp);
            console.log('Login Result:', JSON.stringify(result, null, 2));

            // DEBUG: Show role
            // Alert.alert('Debug Role', `Role: ${result?.user?.role}, New: ${result?.user?.isNewUser}`);

            if (result?.user?.isNewUser) {
                navigation.replace('OnboardingScreen');
            } else if (result?.user?.approvalStatus === 'PENDING' && (result?.user?.role === 'ADVISOR' || result?.user?.role === 'PARTNER')) {
                navigation.replace('WaitingRoom');
            } else if (result?.user?.role === 'ADVISOR') {
                navigation.replace('AdvisorDashboard');
            } else {
                navigation.replace('Dashboard');
            }
        } catch (error) {
            Alert.alert('Error', 'Invalid OTP. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0D0500', '#1C0A00', '#0D0500']} style={styles.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <View style={styles.content}>
                    {/* Logo / Branding */}
                    <Animated.View style={[styles.branding, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.logoContainer}>
                            <LinearGradient colors={['#ba8f0d', '#ffd700']} style={styles.logoBg}>
                                <Sparkles size={36} color="#000" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.appName}>FinSaathi</Text>
                        <Text style={styles.tagline}>Your Money. Your Future. Simplified.</Text>
                    </Animated.View>

                    {/* Form */}
                    <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
                        {step === 'phone' ? (
                            <>
                                <View style={styles.formHeader}>
                                    <Phone size={20} color={colors.accent} />
                                    <Text style={styles.formTitle}>Enter Mobile Number</Text>
                                </View>
                                <Text style={styles.formSubtitle}>
                                    We'll send you an OTP to verify your identity
                                </Text>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.countryCode}>+91</Text>
                                    <TextInput
                                        style={styles.phoneInput}
                                        placeholder="9876543210"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        value={phone}
                                        onChangeText={setPhone}
                                        autoFocus
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, phone.length < 10 && styles.btnDisabled]}
                                    onPress={handleSendOtp}
                                    disabled={phone.length < 10 || isLoading}
                                >
                                    <LinearGradient
                                        colors={phone.length >= 10 ? gradients.goldAccent : [colors.surfaceLight, colors.surfaceLight]}
                                        style={styles.primaryBtnGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#000" />
                                        ) : (
                                            <>
                                                <Text style={styles.primaryBtnText}>Send OTP</Text>
                                                <ArrowRight size={18} color="#000" style={{ marginLeft: 8 }} />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.formHeader}>
                                    <Shield size={20} color={colors.accent} />
                                    <Text style={styles.formTitle}>Verify OTP</Text>
                                </View>
                                <Text style={styles.formSubtitle}>
                                    Enter the 6-digit code sent to +91 {phone}
                                </Text>

                                <TextInput
                                    style={styles.otpInput}
                                    placeholder="• • • • • •"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                    autoFocus
                                    textAlign="center"
                                />

                                <TouchableOpacity
                                    style={[styles.primaryBtn, otp.length !== 6 && styles.btnDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={otp.length !== 6 || isLoading}
                                >
                                    <LinearGradient
                                        colors={otp.length === 6 ? gradients.goldAccent : [colors.surfaceLight, colors.surfaceLight]}
                                        style={styles.primaryBtnGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#000" />
                                        ) : (
                                            <Text style={styles.primaryBtnText}>Verify & Login</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.backLink} onPress={() => setStep('phone')}>
                                    <Text style={styles.backLinkText}>← Change number</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Animated.View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By continuing, you agree to our Terms of Service
                        </Text>
                        <View style={styles.securityBadge}>
                            <Shield size={12} color={colors.textMuted} />
                            <Text style={styles.securityText}>256-bit encrypted • Your data is safe</Text>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content: { flex: 1, justifyContent: 'center', padding: 24 },
    // Branding
    branding: { alignItems: 'center', marginBottom: 48 },
    logoContainer: { marginBottom: 20 },
    logoBg: {
        width: 80, height: 80, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 20,
    },
    appName: {
        fontSize: 36, fontWeight: 'bold', color: colors.brightGold,
        letterSpacing: 2,
    },
    tagline: {
        fontSize: 14, color: colors.textSecondary, marginTop: 8,
        letterSpacing: 0.5,
    },
    // Form Card
    formCard: {
        ...glassmorphism.cardElevated,
        padding: 28,
    },
    formHeader: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    },
    formTitle: {
        fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginLeft: 10,
    },
    formSubtitle: {
        fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20,
    },
    // Phone Input
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        ...glassmorphism.input,
        paddingHorizontal: 16, paddingVertical: 4,
        marginBottom: 24,
    },
    countryCode: {
        fontSize: 18, fontWeight: '600', color: colors.textSecondary,
        marginRight: 12, paddingRight: 12,
        borderRightWidth: 1, borderRightColor: colors.divider,
    },
    phoneInput: {
        flex: 1, fontSize: 22, color: colors.textPrimary, paddingVertical: 14,
        letterSpacing: 2,
    },
    // OTP Input
    otpInput: {
        ...glassmorphism.input,
        fontSize: 32, color: colors.textPrimary, paddingVertical: 16,
        paddingHorizontal: 20, letterSpacing: 12,
        marginBottom: 24, textAlign: 'center',
    },
    // Buttons
    primaryBtn: { borderRadius: 28, overflow: 'hidden' },
    btnDisabled: { opacity: 0.5 },
    primaryBtnGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 28,
    },
    primaryBtnText: {
        fontSize: 17, fontWeight: '700', color: '#000',
    },
    backLink: { alignItems: 'center', marginTop: 16 },
    backLinkText: { color: colors.accent, fontSize: 14 },
    // Footer
    footer: { alignItems: 'center', marginTop: 40 },
    footerText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
    securityBadge: {
        flexDirection: 'row', alignItems: 'center', marginTop: 12,
    },
    securityText: {
        fontSize: 11, color: colors.textMuted, marginLeft: 6,
    },
});
