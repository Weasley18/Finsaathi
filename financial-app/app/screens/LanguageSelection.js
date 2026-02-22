import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ArrowRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CHIP_WIDTH = (width - 72) / 3;

const languages = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { id: 'mr', name: 'Marathi', native: 'मराठी' },
  { id: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা' },
  { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { id: 'te', name: 'Telugu', native: 'తెలుగు' },
  { id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { id: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { id: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { id: 'as', name: 'Assamese', native: 'অসমীয়া' },
];

export default function LanguageSelection({ navigation }) {
  const [selectedLang, setSelectedLang] = useState(null);
  const { i18n, t } = useTranslation();

  const handleContinue = () => {
    if (selectedLang) {
      // Change app language immediately
      i18n.changeLanguage(selectedLang);
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.brandText}>FinSaathi</Text>
        <View style={styles.divider}>
          <LinearGradient
            colors={['transparent', '#ba8f0d', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dividerLine}
          />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Language</Text>
        <Text style={styles.subtitle}>Select your preferred language</Text>

        <ScrollView
          style={styles.chipContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chipGrid}
        >
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.id}
              style={[
                styles.chip,
                selectedLang === lang.id && styles.selectedChip,
              ]}
              onPress={() => setSelectedLang(lang.id)}
              activeOpacity={0.7}
            >
              {/* Glass effect overlay */}
              <View style={[
                styles.chipGlass,
                selectedLang === lang.id && styles.selectedChipGlass,
              ]}>
                <Text
                  style={[
                    styles.chipNative,
                    selectedLang === lang.id && styles.selectedChipText,
                  ]}
                >
                  {lang.native}
                </Text>
                <Text
                  style={[
                    styles.chipName,
                    selectedLang === lang.id && styles.selectedChipSubText,
                  ]}
                >
                  {lang.name}
                </Text>
                {selectedLang === lang.id && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedLang && styles.disabledButton]}
            onPress={handleContinue}
            disabled={!selectedLang}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedLang ? ['#ba8f0d', '#d4a832'] : ['#ccc', '#bbb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={[styles.buttonText, !selectedLang && styles.disabledButtonText]}>
                Continue
              </Text>
              <ArrowRight size={20} color={selectedLang ? '#fff' : '#999'} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf5eb',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ba8f0d',
    fontFamily: 'serif',
    letterSpacing: 2,
  },
  divider: {
    width: 60,
    height: 2,
    marginTop: 8,
  },
  dividerLine: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c1810',
    marginTop: 20,
    marginBottom: 4,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 18,
    color: '#8b6914',
    marginBottom: 24,
    fontWeight: '400',
  },
  chipContainer: {
    flex: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  chip: {
    width: CHIP_WIDTH,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(186, 143, 13, 0.3)',
    overflow: 'hidden',
  },
  selectedChip: {
    borderColor: '#ba8f0d',
    borderWidth: 2,
    shadowColor: '#ba8f0d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  chipGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  selectedChipGlass: {
    backgroundColor: 'rgba(186, 143, 13, 0.12)',
  },
  chipNative: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3a2a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  chipName: {
    fontSize: 11,
    color: '#8b7355',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#8b6914',
  },
  selectedChipSubText: {
    color: '#ba8f0d',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ba8f0d',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 16,
  },
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#ba8f0d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
    letterSpacing: 1,
  },
  disabledButtonText: {
    color: '#999',
  },
});
