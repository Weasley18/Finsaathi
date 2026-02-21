import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Landmark, Briefcase, Gem, MapPin, BadgeIndianRupee, Store, TrendingUp } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function BalanceSheet({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={styles.background}
      />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Balance Sheet</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Results</Text>
            </View>
          </View>

          <View style={styles.netWorthCard}>
            <Text style={styles.netWorthLabel}>Total Net Worth</Text>
            <Text style={styles.netWorthValue}>₹ 7,25,000</Text>
          </View>

          {/* Assets Section */}
          <Text style={styles.sectionTitle}>
            <Text style={{ color: '#4caf50' }}>●</Text> Your Wealth (Assets)
          </Text>

          <View style={styles.list}>
            {/* Bank Savings */}
            <View style={styles.item}>
              <View style={[styles.iconBox, { backgroundColor: '#1a237e' }]}>
                <Landmark size={20} color="#fff" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>Bank Savings</Text>
                <Text style={styles.itemSubText}>HDFC & SBI Accounts</Text>
              </View>
              <View style={styles.itemValues}>
                <Text style={styles.itemAmount}>₹ 45,000</Text>
                <Text style={styles.itemTrend}>+2.4% this month</Text>
              </View>
            </View>

            {/* Cash in Hand */}
            <View style={styles.item}>
              <View style={[styles.iconBox, { backgroundColor: '#33691e' }]}>
                <Briefcase size={20} color="#fff" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>Cash in Hand</Text>
                <Text style={styles.itemSubText}>Home Safe</Text>
              </View>
              <View style={styles.itemValues}>
                <Text style={styles.itemAmount}>₹ 15,000</Text>
              </View>
            </View>

            {/* Gold */}
            <View style={styles.item}>
              <View style={[styles.iconBox, { backgroundColor: '#ff6f00' }]}>
                <Gem size={20} color="#fff" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>Gold Jewelry</Text>
                <Text style={styles.itemSubText}>42 Grams (Current Rate)</Text>
              </View>
              <View style={styles.itemValues}>
                <Text style={styles.itemAmount}>₹ 2,85,000</Text>
                <Text style={styles.itemNote}>Updated yesterday</Text>
              </View>
            </View>

            {/* Plot */}
            <View style={styles.item}>
              <View style={[styles.iconBox, { backgroundColor: '#3e2723' }]}>
                <MapPin size={20} color="#fff" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>Ancestral Plot</Text>
                <Text style={styles.itemSubText}>Village Land</Text>
              </View>
              <View style={styles.itemValues}>
                <Text style={styles.itemAmount}>₹ 5,00,000</Text>
              </View>
            </View>
          </View>

          {/* Dues Section */}
          <Text style={styles.sectionTitle}>
            <Text style={{ color: '#f44336' }}>●</Text> Your Dues (Loans)
          </Text>

          <View style={styles.list}>
            {/* Personal Loan */}
            <View style={styles.item}>
              <View style={[styles.iconBox, { backgroundColor: '#b71c1c' }]}>
                <BadgeIndianRupee size={20} color="#fff" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>Personal Loan</Text>
                <Text style={styles.itemSubText}>Monthly EMI: ₹4,200</Text>
              </View>
              <View style={styles.itemValues}>
                <Text style={styles.itemAmountNegative}>₹ 85,000</Text>
                <Text style={styles.itemWarning}>Due in 5 days</Text>
              </View>
            </View>

            {/* Shop Dues */}
            <View style={styles.item}>
              <View style={[styles.iconBox, { backgroundColor: '#e65100' }]}>
                <Store size={20} color="#fff" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>Shop Dues</Text>
                <Text style={styles.itemSubText}>Ration & Supplies</Text>
              </View>
              <View style={styles.itemValues}>
                <Text style={styles.itemAmountNegative}>₹ 35,000</Text>
                <Text style={styles.itemNote}>Pending</Text>
              </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  netWorthCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 30,
    alignItems: 'center',
  },
  netWorthLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  netWorthValue: {
    color: '#ba8f0d',
    fontSize: 36,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginTop: 10,
  },
  list: {
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  itemSubText: {
    fontSize: 12,
    color: '#666',
  },
  itemValues: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  itemAmountNegative: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 2,
  },
  itemTrend: {
    fontSize: 10,
    color: '#4caf50',
  },
  itemNote: {
    fontSize: 10,
    color: '#666',
  },
  itemWarning: {
    fontSize: 10,
    color: '#f44336',
  },
});
