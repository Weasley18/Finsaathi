import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors as Colors, typography as Typography, spacing as Layout } from '../theme';
import { ShoppingBag, Landmark, ChevronRight, CheckCircle, ExternalLink, Star } from 'lucide-react-native';
import api from '../services/api';

export default function DiscoverMarketplace({ navigation }) {
    const [activeTab, setActiveTab] = useState('products'); // 'products' | 'schemes'
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [schemes, setSchemes] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch both products and schemes
            const [productsRes, schemesRes] = await Promise.all([
                api.get('/partners/marketplace/products'),
                api.get('/content/marketplace/schemes')
            ]);

            setProducts(productsRes.data.products || []);
            setSchemes(schemesRes.data.schemes || []);
        } catch (error) {
            console.error('Error fetching marketplace data:', error);
            Alert.alert('Error', 'Failed to load discover marketplace.');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (product) => {
        if (product.hasApplied) return;

        Alert.alert(
            `Apply for ${product.name}?`,
            `Are you sure you want to share your basic profile details with ${product.partnerName} to apply?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'default',
                    onPress: async () => {
                        try {
                            await api.post(`/partners/apply/${product.id}`);
                            Alert.alert('Success', 'Application submitted successfully!');
                            fetchData(); // Refresh to update status
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to apply.');
                        }
                    }
                }
            ]
        );
    };

    const openLink = (url) => {
        if (url) Linking.openURL(url);
    };

    const renderProductCard = (product) => {
        return (
            <View key={product.id} style={[styles.card, product.isEligible && styles.cardHighlight]}>
                {product.isEligible && (
                    <View style={styles.badgeContainer}>
                        <Star size={12} color={Colors.white} fill={Colors.white} />
                        <Text style={styles.badgeText}>Recommended: {product.matchReason}</Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <ShoppingBag size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.cardHeaderTexts}>
                        <Text style={styles.cardTitle}>{product.name}</Text>
                        <Text style={styles.cardSubtitle}>{product.partnerName} • {product.type.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                </View>

                <Text style={styles.cardDescription}>{product.description}</Text>

                <View style={styles.cardStats}>
                    {product.interestRate && (
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Interest Rate</Text>
                            <Text style={styles.statValue}>{product.interestRate}%</Text>
                        </View>
                    )}
                    {product.maxAmount && (
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Up to</Text>
                            <Text style={styles.statValue}>₹{product.maxAmount.toLocaleString()}</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        product.hasApplied ? styles.actionButtonDisabled :
                            (product.isEligible ? styles.actionButtonPrimary : styles.actionButtonSecondary)
                    ]}
                    disabled={product.hasApplied}
                    onPress={() => handleApply(product)}
                >
                    {product.hasApplied ? (
                        <>
                            <CheckCircle size={18} color={Colors.white} />
                            <Text style={styles.actionButtonText}>Applied</Text>
                        </>
                    ) : (
                        <Text style={[styles.actionButtonText, !product.isEligible && { color: Colors.text }]}>
                            Apply Now
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderSchemeCard = (scheme) => {
        return (
            <View key={scheme.id} style={[styles.card, scheme.isEligible && styles.cardHighlight]}>
                {scheme.isEligible && (
                    <View style={[styles.badgeContainer, { backgroundColor: '#2e7d32' }]}>
                        <CheckCircle size={12} color={Colors.white} />
                        <Text style={styles.badgeText}>Eligible: {scheme.matchReason}</Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
                        <Landmark size={24} color="#2e7d32" />
                    </View>
                    <View style={styles.cardHeaderTexts}>
                        <Text style={styles.cardTitle}>{scheme.name}</Text>
                        <Text style={styles.cardSubtitle}>Government Scheme</Text>
                    </View>
                </View>

                <Text style={styles.cardDescription}>{scheme.description}</Text>

                <View style={styles.benefitsBox}>
                    <Text style={styles.benefitsTitle}>Key Benefits:</Text>
                    <Text style={styles.benefitsText}>{scheme.benefits}</Text>
                </View>

                {scheme.link && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonOutline]}
                        onPress={() => openLink(scheme.link)}
                    >
                        <Text style={[styles.actionButtonText, { color: Colors.primary }]}>Learn More</Text>
                        <ExternalLink size={16} color={Colors.primary} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Discover</Text>
                <Text style={styles.headerSubtitle}>Products & Schemes tailored for you</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'products' && styles.activeTab]}
                    onPress={() => setActiveTab('products')}
                >
                    <ShoppingBag size={18} color={activeTab === 'products' ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>Partner Products</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'schemes' && styles.activeTab]}
                    onPress={() => setActiveTab('schemes')}
                >
                    <Landmark size={18} color={activeTab === 'schemes' ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.tabText, activeTab === 'schemes' && styles.activeTabText]}>Govt. Schemes</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {activeTab === 'products' ? (
                        products.length > 0 ? products.map(renderProductCard) : (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No financial products available right now.</Text>
                            </View>
                        )
                    ) : (
                        schemes.length > 0 ? schemes.map(renderSchemeCard) : (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No schemes available right now.</Text>
                            </View>
                        )
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: Layout.lg,
        paddingBottom: 16,
    },
    headerTitle: {
        ...Typography.h1,
        color: Colors.text,
    },
    headerSubtitle: {
        ...Typography.body,
        color: Colors.textMuted,
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: Layout.lg,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        ...Typography.subtitle,
        color: Colors.textMuted,
        marginLeft: 8,
    },
    activeTabText: {
        color: Colors.white,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: Layout.lg,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHighlight: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(212, 175, 55, 0.03)', // very subtle gold tint
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 16,
    },
    badgeText: {
        color: Colors.border, // Very dark near black for contrast on gold
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardHeaderTexts: {
        flex: 1,
    },
    cardTitle: {
        ...Typography.h3,
        color: Colors.text,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 12,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    cardDescription: {
        ...Typography.body,
        color: Colors.text,
        opacity: 0.8,
        marginBottom: 16,
        lineHeight: 20,
    },
    cardStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    benefitsBox: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#2e7d32',
    },
    benefitsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginBottom: 4,
    },
    benefitsText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    actionButton: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonPrimary: {
        backgroundColor: Colors.primary,
    },
    actionButtonSecondary: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionButtonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    actionButtonDisabled: {
        backgroundColor: '#2e7d32', // Green for applied success state
    },
    actionButtonText: {
        fontWeight: 'bold',
        fontSize: 15,
        color: Colors.background, // Dark text on primary button
        marginLeft: 8,
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: Colors.textMuted,
        textAlign: 'center',
    }
});
