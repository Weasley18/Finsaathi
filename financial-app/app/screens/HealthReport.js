import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Award, Target } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const ScoreGauge = ({ score }) => {
  const radius = 80;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 100;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={200} height={200}>
        <G rotation="-90" origin="100, 100">
          <Circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#333"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#4caf50"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
        <SvgText
          x="100"
          y="105"
          fill="#fff"
          fontSize={40}
          fontWeight="bold"
          textAnchor="middle"
        >
          {score}
        </SvgText>
        <SvgText
          x="100"
          y="135"
          fill="#888"
          fontSize={14}
          textAnchor="middle"
        >
          Good
        </SvgText>
      </Svg>
    </View>
  );
};

export default function HealthReport({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={styles.background}
      />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Financial Health</Text>
          <Text style={styles.subHeader}>Welcome back, Rajesh</Text>

          <Text style={styles.sectionTitle}>October Summary</Text>

          {/* Score Card */}
          <LinearGradient
            colors={['#2a2a2a', '#1e1e1e']}
            style={styles.scoreCard}
          >
            <Text style={styles.cardTitle}>AI Financial Health Score</Text>
            <Text style={styles.cardSubtitle}>Based on your spending habits</Text>

            <ScoreGauge score={78} />

            <View style={styles.insightBox}>
              <Award size={24} color="#ba8f0d" style={styles.insightIcon} />
              <Text style={styles.insightText}>
                Great job! You managed to save 15% more than last month. Your emergency fund is growing steadily.
              </Text>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <TrendingUp size={24} color="#4caf50" />
              </View>
              <Text style={styles.statLabel}>Cash Flow</Text>
              <Text style={styles.statValue}>Positive</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                <Target size={24} color="#2196f3" />
              </View>
              <Text style={styles.statLabel}>Goal Status</Text>
              <Text style={styles.statValue}>On Track</Text>
            </View>
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
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 16,
    color: '#888',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  insightBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(186, 143, 13, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(186, 143, 13, 0.3)',
  },
  insightIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
