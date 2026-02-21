import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, PieChart, GraduationCap, User, Link2 } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function BottomNav() {
    const navigation = useNavigation();
    const route = useRoute();
    const currentRoute = route.name;

    const tabs = [
        { name: 'Dashboard', icon: Home, label: 'Home' },
        { name: 'SpendingReport', icon: PieChart, label: 'Analysis' },
        { name: 'LinkFinance', icon: Link2, label: 'Link', isMiddle: true },
        { name: 'FinancialInsights', icon: GraduationCap, label: 'Learn' },
        { name: 'ProfileSettings', icon: User, label: 'Profile' },
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = currentRoute === tab.name;

                if (tab.isMiddle) {
                    return (
                        <TouchableOpacity
                            key={index}
                            style={styles.middleButtonContainer}
                            onPress={() => navigation.navigate('LinkFinance')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.middleButton}>
                                <Icon size={28} color="#000" />
                            </View>
                        </TouchableOpacity>
                    );
                }

                return (
                    <TouchableOpacity
                        key={index}
                        style={styles.tab}
                        onPress={() => navigation.navigate(tab.name)}
                    >
                        <Icon size={24} color={isActive ? '#ba8f0d' : '#666'} />
                        <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 30, // Floating tab bar style
        marginHorizontal: 20,
        marginBottom: 30, // lifted from bottom
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    label: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    activeLabel: {
        color: '#ba8f0d',
    },
    middleButtonContainer: {
        top: -20, // push it up
        justifyContent: 'center',
        alignItems: 'center',
    },
    middleButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ba8f0d',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ba8f0d',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
});
