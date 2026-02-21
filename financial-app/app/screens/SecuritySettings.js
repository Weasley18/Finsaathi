import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldAlert, Lock, Fingerprint, EyeOff, ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function SecuritySettings({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={styles.background}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security Center</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Status Card */}
          <LinearGradient
            colors={['#1b5e20', '#000']}
            style={styles.statusCard}
          >
            <ShieldAlert size={48} color="#4caf50" style={styles.statusIcon} />
            <Text style={styles.statusTitle}>Fortress Active</Text>
            <Text style={styles.statusDesc}>Your financial kingdom is protected by our Royal Guard protocols.</Text>
          </LinearGradient>

          {/* Features List */}
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(33, 150, 243, 0.2)' }]}>
                <Lock size={24} color="#2196f3" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>256-bit Royal Encryption</Text>
                <Text style={styles.featureDesc}>Bank-grade protection. Your data is scrambled into an unbreakable code.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 193, 7, 0.2)' }]}>
                <Fingerprint size={24} color="#ffc107" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>Biometric Lock</Text>
                <Text style={styles.featureDesc}>Use your face or fingerprint to open the treasury gates.</Text>
              </View>
              <Switch value={true} trackColor={{ false: '#333', true: '#ba8f0d' }} />
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(156, 39, 176, 0.2)' }]}>
                <EyeOff size={24} color="#9c27b0" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>Privacy Mode</Text>
                <Text style={styles.featureDesc}>Mask your wealth. Balances will be hidden from prying eyes.</Text>
              </View>
              <Switch value={false} trackColor={{ false: '#333', true: '#ba8f0d' }} />
            </View>
          </View>

          <Text style={styles.footerNote}>FinSaathi ensures your data is never sold to third parties.</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginTop: 10,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  statusCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1b5e20',
    marginBottom: 30,
  },
  statusIcon: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statusDesc: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  featureList: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
    marginRight: 10,
  },
  featureName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  footerNote: {
    textAlign: 'center',
    color: '#444',
    fontSize: 12,
  },
});
