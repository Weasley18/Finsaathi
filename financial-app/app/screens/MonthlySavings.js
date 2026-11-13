import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Lightbulb } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function MonthlySavings({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={styles.background}
      />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Monthly Savings</Text>

          {/* Goal Progress Card */}
          <LinearGradient
            colors={['#2a2a2a', '#1e1e1e']}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>March Goal: ₹10,000</Text>
            <Text style={styles.savedAmount}>₹7,500 <Text style={styles.savedLabel}>Saved</Text></Text>

            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#4caf50', '#8bc34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: '75%' }]}
              />
            </View>
            <Text style={styles.goalMessage}>Excellent work! You are just ₹2,500 away from your target.</Text>
          </LinearGradient>

          {/* Growth Trends Placeholder */}
          <Text style={styles.sectionTitle}>Growth Trends</Text>
          <View style={styles.chartPlaceholder}>
            <TrendingUp size={48} color="#ba8f0d" />
            <Text style={styles.chartText}>Savings growth chart will appear here</Text>
          </View>

          {/* Insight */}
          <View style={styles.insightBox}>
            <View style={styles.insightHeader}>
              <Lightbulb size={20} color="#ba8f0d" />
              <Text style={styles.insightTitle}>FinSaathi AI Insight</Text>
            </View>
            <Text style={styles.insightText}>
              You usually save more in the second week of the month. Try adding ₹500 this Friday to hit your goal faster!
            </Text>
          </View>

          {/* Spacer for BottomNav */}
          <View style={{ height: 100 }} />
        </ScrollView>

        <BottomNav />
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
  scrollContent: {
    padding: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    marginBottom: 30,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  savedAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  savedLabel: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: 'normal',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalMessage: {
    fontSize: 14,
    color: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  chartText: {
    color: '#666',
    marginTop: 10,
  },
  insightBox: {
    backgroundColor: 'rgba(186, 143, 13, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(186, 143, 13, 0.3)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightTitle: {
    color: '#ba8f0d',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  insightText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
});
