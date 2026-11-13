// FinSaathi Liquid Glass Design System
// Royal theme: deep burgundy, warm gold, crimson, parchment white

export const colors = {
    // Primary Palette
    primaryBurgundy: '#1C0A00',
    darkGold: '#B8860B',
    royalCrimson: '#C0392B',
    brightGold: '#D4AF37',
    parchmentWhite: '#FDF6E3',
    ivoryWhite: '#FFFDF7',

    // Semantic
    accent: '#ba8f0d',       // Main gold accent
    accentLight: '#ffd700',
    accentDark: '#8B6914',

    // Surfaces
    background: '#0D0500',
    surface: '#1C0A00',
    surfaceLight: '#2A1505',
    surfaceGlass: 'rgba(28,10,0,0.75)',
    cardBg: 'rgba(28,10,0,0.6)',
    cardBorder: 'rgba(212,175,55,0.3)',
    cardBorderBright: 'rgba(212,175,55,0.5)',

    // Glass effects
    glassDark: 'rgba(28,10,0,0.75)',
    glassLight: 'rgba(253,246,227,0.12)',
    glassOverlay: 'rgba(28,10,0,0.85)',

    // Text
    textPrimary: '#FDF6E3',
    textSecondary: '#B8A080',
    textMuted: '#6B4F3A',
    textGold: '#D4AF37',

    // Status
    success: '#7D6008',
    successLight: '#4caf50',
    warning: '#C0392B',
    error: '#e74c3c',
    info: '#3498db',

    // Misc
    white: '#fff',
    black: '#000',
    divider: 'rgba(212,175,55,0.15)',
};

export const gradients = {
    background: ['#0D0500', '#1C0A00'],
    backgroundRoyal: ['#1C0A00', '#0D0500', '#1A0800'],
    goldCard: ['#2A1505', '#1C0A00'],
    goldAccent: ['#ba8f0d', '#ffd700'],
    crimsonAccent: ['#C0392B', '#e74c3c'],
    surfaceCard: ['rgba(42,21,5,0.9)', 'rgba(28,10,0,0.9)'],
};

export const glassmorphism = {
    card: {
        backgroundColor: 'rgba(28,10,0,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.3)',
        borderRadius: 20,
        // Note: backdrop-filter (blur) is not natively supported in RN
        // but the semi-transparent bg + border creates a glass-like effect
    },
    cardElevated: {
        backgroundColor: 'rgba(42,21,5,0.8)',
        borderWidth: 1.5,
        borderColor: 'rgba(212,175,55,0.4)',
        borderRadius: 20,
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    input: {
        backgroundColor: 'rgba(28,10,0,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.25)',
        borderRadius: 16,
    },
    inputFocused: {
        borderColor: '#D4AF37',
        borderWidth: 1.5,
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    bottomNav: {
        backgroundColor: 'rgba(28,10,0,0.9)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(212,175,55,0.2)',
    },
};

export const typography = {
    heading1: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    heading2: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    heading3: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    body: {
        fontSize: 16,
        color: colors.textPrimary,
        lineHeight: 24,
    },
    bodySmall: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    caption: {
        fontSize: 12,
        color: colors.textMuted,
        letterSpacing: 0.5,
    },
    goldAccent: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.brightGold,
        letterSpacing: 0.5,
    },
    amount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    amountSmall: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export default {
    colors,
    gradients,
    glassmorphism,
    typography,
    spacing,
};
